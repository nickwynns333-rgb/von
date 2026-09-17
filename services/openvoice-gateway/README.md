# VonWork OpenVoice Gateway

This is a **separate GPU service** for consented custom speech. It is not intended to run inside the VonWork managed web application. The main application uses the gateway only through its authenticated `POST /v1/audio/speech` contract.

## What it does

The gateway creates an opaque voice-profile ID from a reference recording that has already been approved in VonWork, and it returns WAV audio for a short chatbot or video-agent reply. The service does not accept an arbitrary filesystem path, does not expose its gateway token to browsers, and applies upload and text-length limits.

When consent is revoked in VonWork, the main application resets that agent to its built-in voice and sends `DELETE /v1/voice-profiles/{profile_id}` to remove the corresponding OpenVoice embedding. Failed deletion is logged for operational follow-up; the voice remains disabled in VonWork regardless.

## GPU deployment

Use a CUDA-capable host with a mounted model volume and persistent profile volume. Build and run the service outside the main web application:

```bash
docker build -t vonwork-openvoice services/openvoice-gateway
docker run --gpus all --rm -p 8080:8080 \
  -e OPENVOICE_GATEWAY_TOKEN="store-this-in-your-host-secret-manager" \
  -v /srv/openvoice-models:/models/openvoice:ro \
  -v /srv/openvoice-profiles:/data/profiles \
  vonwork-openvoice
```

Before the service becomes ready, mount the approved OpenVoice checkpoint bundle so these files exist: `checkpoints/base_speakers/EN/config.json`, `checkpoint.pth`, `en_default_se.pth`, and `checkpoints/converter/config.json` with its checkpoint.

> The repository’s V1 example uses `BaseSpeakerTTS`, `ToneColorConverter`, a base-speaker embedding, and a target embedding extracted from a reference recording. This gateway mirrors that documented runtime sequence.[1]

## Connect VonWork

1. Confirm `GET /health` reports `ready: true` over HTTPS.
2. Set `OPENVOICE_SERVICE_URL` to the service base URL and `OPENVOICE_SERVICE_TOKEN` to the gateway token in VonWork’s secure settings.
3. Upload a consented reference sample in Voice Studio. The gateway returns an opaque `voice_profile_id`.
4. Select the OpenVoice output option for the agent. Chatbot text continues to use OpenRouter; the gateway produces optional audio. A LiveKit/Simli meeting uses the same audio for the video avatar.

## Required operational controls

Keep the service network-private or IP-restricted, terminate TLS at the gateway, rotate the bearer token, encrypt persistent profile storage, implement profile deletion when consent is revoked, and rate-limit the public edge. Do not use this service for a voice without the signed VonWork consent record.

## References

[1]: https://github.com/myshell-ai/OpenVoice "OpenVoice repository and V1 runtime example"
