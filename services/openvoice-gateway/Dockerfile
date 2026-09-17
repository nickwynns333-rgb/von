# Deploy this container to a GPU-capable host, not the managed VonWork web application.
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-dev ffmpeg git wget unzip ca-certificates pkg-config \
    libavcodec-dev libavdevice-dev libavfilter-dev libavformat-dev libavutil-dev \
    libswresample-dev libswscale-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /service
COPY requirements.txt ./
RUN python3 -m pip install --no-cache-dir --upgrade pip \
    && python3 -m pip install --no-cache-dir --only-binary=:all: "av>=11,<13" "faster-whisper==1.0.3" \
    && python3 -m pip install --no-cache-dir -r requirements.txt \
    && python3 -m pip install --no-cache-dir --no-deps "git+https://github.com/myshell-ai/OpenVoice.git"
COPY app.py ./

# Download only the official OpenVoice V1 English and converter checkpoints
# needed by this gateway. Weights are intentionally not committed to source.
ARG OPENVOICE_HF=https://huggingface.co/myshell-ai/OpenVoice/resolve/main/checkpoints
RUN mkdir -p /models/openvoice/checkpoints/base_speakers/EN /models/openvoice/checkpoints/converter \
    && wget -q -O /models/openvoice/checkpoints/base_speakers/EN/config.json "$OPENVOICE_HF/base_speakers/EN/config.json?download=true" \
    && wget -q -O /models/openvoice/checkpoints/base_speakers/EN/checkpoint.pth "$OPENVOICE_HF/base_speakers/EN/checkpoint.pth?download=true" \
    && wget -q -O /models/openvoice/checkpoints/base_speakers/EN/en_default_se.pth "$OPENVOICE_HF/base_speakers/EN/en_default_se.pth?download=true" \
    && wget -q -O /models/openvoice/checkpoints/converter/config.json "$OPENVOICE_HF/converter/config.json?download=true" \
    && wget -q -O /models/openvoice/checkpoints/converter/checkpoint.pth "$OPENVOICE_HF/converter/checkpoint.pth?download=true"

ENV OPENVOICE_MODEL_ROOT=/models/openvoice \
    OPENVOICE_PROFILE_ROOT=/data/profiles \
    OPENVOICE_MAX_INPUT_CHARS=2400 \
    OPENVOICE_MAX_REFERENCE_BYTES=20971520
VOLUME ["/models/openvoice", "/data/profiles"]
EXPOSE 8080
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}"]
