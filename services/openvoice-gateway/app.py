"""VonWork OpenVoice gateway.

Run this service only on a GPU-capable host. It is deliberately separate from
the main VonWork web application and accepts audio only after VonWork has
recorded a signed voice-consent receipt.
"""

from __future__ import annotations

import os
import secrets
import shutil
import tempfile
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

GATEWAY_TOKEN = os.environ.get("OPENVOICE_GATEWAY_TOKEN", "")
MODEL_ROOT = Path(os.environ.get("OPENVOICE_MODEL_ROOT", "/models/openvoice"))
PROFILE_ROOT = Path(os.environ.get("OPENVOICE_PROFILE_ROOT", "/data/profiles"))
MAX_INPUT_CHARS = int(os.environ.get("OPENVOICE_MAX_INPUT_CHARS", "2400"))
MAX_AUDIO_BYTES = int(os.environ.get("OPENVOICE_MAX_REFERENCE_BYTES", str(20 * 1024 * 1024)))

app = FastAPI(title="VonWork OpenVoice Gateway", version="1.0.0")
_runtime: "OpenVoiceRuntime | None" = None


def require_bearer(authorization: str | None, gateway_token: str | None = None) -> None:
    supplied_token = gateway_token or authorization
    if not GATEWAY_TOKEN or supplied_token != f"Bearer {GATEWAY_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


class SpeechRequest(BaseModel):
    input: str = Field(min_length=1, max_length=MAX_INPUT_CHARS)
    voice_profile_id: str = Field(pattern=r"^[a-zA-Z0-9_-]{12,128}$")
    response_format: Literal["wav"] = "wav"
    language: Literal["en"] = "en"


class OpenVoiceRuntime:
    def __init__(self) -> None:
        import torch
        from openvoice.api import BaseSpeakerTTS, ToneColorConverter

        if not torch.cuda.is_available():
            raise RuntimeError("A CUDA GPU is required for the production OpenVoice gateway.")
        self.device = "cuda:0"
        base_dir = MODEL_ROOT / "checkpoints" / "base_speakers" / "EN"
        converter_dir = MODEL_ROOT / "checkpoints" / "converter"
        if not (base_dir / "config.json").exists() or not (converter_dir / "config.json").exists():
            raise RuntimeError("OpenVoice checkpoints are missing. Mount the approved checkpoint bundle at OPENVOICE_MODEL_ROOT.")
        self.base = BaseSpeakerTTS(str(base_dir / "config.json"), device=self.device)
        self.base.load_ckpt(str(base_dir / "checkpoint.pth"))
        self.converter = ToneColorConverter(str(converter_dir / "config.json"), device=self.device)
        self.converter.load_ckpt(str(converter_dir / "checkpoint.pth"))
        self.source_embedding = torch.load(base_dir / "en_default_se.pth", map_location=self.device).to(self.device)
        self.torch = torch

    def enroll(self, reference_path: Path, profile_id: str) -> None:
        from openvoice import se_extractor

        PROFILE_ROOT.mkdir(parents=True, exist_ok=True)
        target_embedding, _ = se_extractor.get_se(str(reference_path), self.converter, target_dir=str(PROFILE_ROOT / "processed"), vad=True)
        self.torch.save(target_embedding, PROFILE_ROOT / f"{profile_id}.pth")

    def synthesize(self, text: str, profile_id: str, destination: Path) -> None:
        target_path = PROFILE_ROOT / f"{profile_id}.pth"
        if not target_path.exists():
            raise HTTPException(status_code=404, detail="Voice profile not found")
        with tempfile.TemporaryDirectory(prefix="vonwork-openvoice-") as temporary_directory:
            source_path = Path(temporary_directory) / "source.wav"
            self.base.tts(text, str(source_path), speaker="default", language="English", speed=1.0)
            self.converter.convert(
                audio_src_path=str(source_path),
                src_se=self.source_embedding,
                tgt_se=self.torch.load(target_path, map_location=self.device),
                output_path=str(destination),
                message="@MyShell",
            )


def runtime() -> OpenVoiceRuntime:
    global _runtime
    if _runtime is None:
        _runtime = OpenVoiceRuntime()
    return _runtime


@app.get("/ping")
def ping() -> dict:
    """RunPod load-balancer liveness probe; detailed readiness remains on /health."""
    return {"status": "ok"}


@app.get("/health")
def health() -> dict:
    import torch

    base_ready = (MODEL_ROOT / "checkpoints" / "base_speakers" / "EN" / "config.json").exists()
    converter_ready = (MODEL_ROOT / "checkpoints" / "converter" / "config.json").exists()
    return {
        "service": "vonwork-openvoice-gateway",
        "gpu_available": torch.cuda.is_available(),
        "checkpoints_ready": base_ready and converter_ready,
        "ready": bool(GATEWAY_TOKEN and torch.cuda.is_available() and base_ready and converter_ready),
    }


@app.post("/v1/voice-profiles")
async def create_voice_profile(
    authorization: str | None = Header(default=None),
    gateway_token: str | None = Header(default=None, alias="X-OpenVoice-Token"),
    audio: UploadFile = File(...),
    consent_receipt: str = Form(..., min_length=8, max_length=255),
    agent_id: int = Form(..., ge=1),
) -> dict:
    require_bearer(authorization, gateway_token)
    profile_id = secrets.token_urlsafe(18).replace("-", "_")
    reference_path = Path(tempfile.mkdtemp(prefix="vonwork-reference-")) / "reference.wav"
    try:
        written = 0
        with reference_path.open("wb") as output:
            while chunk := await audio.read(1024 * 1024):
                written += len(chunk)
                if written > MAX_AUDIO_BYTES:
                    raise HTTPException(status_code=413, detail="Reference audio exceeds the configured limit")
                output.write(chunk)
        runtime().enroll(reference_path, profile_id)
        return {"voice_profile_id": profile_id, "agent_id": agent_id, "consent_receipt": consent_receipt, "provider": "OpenVoice"}
    finally:
        shutil.rmtree(reference_path.parent, ignore_errors=True)


@app.post("/v1/audio/speech")
def synthesize_speech(
    payload: SpeechRequest,
    authorization: str | None = Header(default=None),
    gateway_token: str | None = Header(default=None, alias="X-OpenVoice-Token"),
) -> FileResponse:
    require_bearer(authorization, gateway_token)
    destination_dir = Path(tempfile.mkdtemp(prefix="vonwork-speech-"))
    destination = destination_dir / "speech.wav"
    runtime().synthesize(payload.input, payload.voice_profile_id, destination)
    return FileResponse(destination, media_type="audio/wav", filename="speech.wav", background=None)


@app.delete("/v1/voice-profiles/{profile_id}")
def delete_voice_profile(
    profile_id: str,
    authorization: str | None = Header(default=None),
    gateway_token: str | None = Header(default=None, alias="X-OpenVoice-Token"),
) -> dict:
    require_bearer(authorization, gateway_token)
    if not profile_id.replace("_", "").isalnum() or not 12 <= len(profile_id) <= 128:
        raise HTTPException(status_code=400, detail="Invalid voice profile ID")
    profile_path = PROFILE_ROOT / f"{profile_id}.pth"
    profile_path.unlink(missing_ok=True)
    return {"deleted": True, "voice_profile_id": profile_id}
