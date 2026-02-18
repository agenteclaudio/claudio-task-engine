# Task-008: Talk Mode — Implementation Plan

## Overview

Talk mode enables voice conversations with OpenClaw/Claudio: speak → STT → chat → TTS → hear response. Primary use cases: hands-free (driving, cooking), quick questions, accessibility.

## Architecture

```
iPhone (mic) → Groq Whisper STT → OpenClaw Chat Session → TTS Engine → iPhone (speaker)
                                                            ↓
                                              ElevenLabs API (cloud, low latency)
                                              Kokoro (local, zero cost, higher latency)
```

### Communication Flow

1. **Input**: iPhone captures audio → sends to gateway via Tailscale
2. **STT**: Groq `whisper-large-v3-turbo` (already configured, ~1-2s latency for 10s audio)
3. **Processing**: OpenClaw processes text through active chat session
4. **TTS**: Response text → audio via ElevenLabs or Kokoro
5. **Output**: Audio streamed back to iPhone speaker

## Components

### 1. iPhone as Node (via Tailscale)

- iPhone already on Tailscale network (assumption — verify with user)
- OpenClaw supports `node` concept for remote devices
- Need: a lightweight iOS app or Shortcut that:
  - Records audio on tap/wake word
  - POSTs audio to gateway endpoint
  - Plays back audio response
- **Alternative**: Use a simple web app (PWA) served by the gateway — works on any device, no App Store needed

### 2. Gateway Talk Endpoint

New endpoint on OpenClaw gateway:
- `POST /talk` — accepts audio blob, returns audio response
- Or WebSocket `/talk/ws` for streaming (lower perceived latency)

Flow:
```
Audio in → STT (Groq) → text → OpenClaw session → response text → TTS → audio out
```

### 3. STT (Speech-to-Text)

| Option | Latency | Cost | Quality | Notes |
|--------|---------|------|---------|-------|
| **Groq Whisper** (primary) | ~1-2s | Free tier: 7K min/month | Excellent | Already configured |
| whisper.cpp local (fallback) | ~3-5s on Ryzen 3 | Free | Good | Already configured |
| Browser Web Speech API | Real-time | Free | Good | Only works in PWA approach |

**Recommendation**: Groq Whisper primary, with Browser Web Speech API as real-time alternative in PWA mode.

### 4. TTS (Text-to-Speech)

| Option | Latency | Cost | Quality | Streaming | Notes |
|--------|---------|------|---------|-----------|-------|
| **ElevenLabs** | ~200-500ms TTFB | $5/mo (30K chars), $22/mo (100K chars) | Excellent, natural | Yes (chunked) | Best quality, needs API key |
| **Kokoro** (local) | ~1-3s on Ryzen 3 | Free | Good | Possible | Already available on server |
| OpenAI TTS | ~300-600ms | ~$15/1M chars | Very good | Yes | Alternative cloud option |
| Edge TTS | ~200ms | Free | Decent | Yes | Microsoft, free but TOS gray area |

**Recommendation**: 
- **Default**: Kokoro (free, private, good enough for most use)
- **Premium**: ElevenLabs when quality matters (can toggle via config)
- Consider Edge TTS as free cloud middle ground

### 5. ElevenLabs Details

- **API Key**: Yes, required. Get at elevenlabs.io
- **Free tier**: 10K chars/month (~10 min of speech) — too low for daily use
- **Starter**: $5/month, 30K chars (~30 min) — reasonable for light use
- **Creator**: $22/month, 100K chars (~100 min) — good for daily use
- **Streaming**: Supports chunked streaming (send text chunks, get audio chunks back)
- **Voices**: Many pre-built + voice cloning. Can clone user's preferred voice
- **Latency**: ~200-500ms time to first byte with streaming API
- **Websocket API**: Available for real-time conversational use

## Implementation Plan

### Phase 1: PWA + Basic Talk (MVP) — ~2-3 days effort

1. **Create talk PWA** (`/agent/skills/talk/`)
   - Simple web page: hold-to-talk button, audio visualization
   - Uses MediaRecorder API to capture audio
   - Sends audio to gateway, plays back response
   - Serve from gateway on a port

2. **Gateway talk endpoint**
   - `POST /api/talk` — audio in, audio out
   - Wires: Groq STT → OpenClaw chat → Kokoro TTS
   - Returns audio/mpeg stream

3. **Kokoro TTS integration**
   - Wrap existing Kokoro in a simple API if not already
   - Generate speech from response text

### Phase 2: Streaming + ElevenLabs — ~1-2 days

4. **WebSocket streaming**
   - `/api/talk/ws` for continuous conversation
   - Stream TTS audio as chunks arrive (lower latency)

5. **ElevenLabs integration**
   - Add ElevenLabs as TTS provider option
   - Store API key in vault
   - Voice selection config

### Phase 3: Polish — ~1-2 days

6. **Wake word** (optional)
   - "Hey Claudio" via Picovoice Porcupine (runs in browser)
   - Or just use push-to-talk (simpler, more reliable)

7. **Conversation mode**
   - Auto-listen after response finishes
   - Silence detection to auto-send
   - "Stop" / "Cancel" voice commands

8. **iPhone Shortcut** (optional)
   - For quick Siri-like activation without opening browser
   - Record audio → POST to endpoint → play response

## Data Flow (MVP)

```
User taps "Talk" on PWA (iPhone browser via Tailscale)
  → MediaRecorder captures audio (webm/opus)
  → POST /api/talk with audio blob
  → Gateway: save temp file → Groq STT → text
  → Gateway: openclaw chat send → response text  
  → Gateway: Kokoro TTS → audio/mp3
  → Stream audio back to PWA
  → PWA plays audio via Audio API
~3-6 seconds total round-trip (MVP)
```

## Setup Steps

1. Verify iPhone on Tailscale can reach gateway
2. Create `/agent/skills/talk/` skill directory
3. Implement gateway endpoint (Node.js/Express or use OpenClaw's built-in)
4. Build PWA (single HTML file + JS, minimal)
5. Test with Kokoro TTS
6. (Optional) Add ElevenLabs API key, configure as premium TTS
7. Add to OpenClaw as a skill with SKILL.md

## Cost Estimate

| Component | Monthly Cost |
|-----------|-------------|
| Groq STT | Free (7K min/month) |
| Kokoro TTS | Free (local) |
| ElevenLabs (optional) | $5-22/month |
| Infrastructure | $0 (runs on existing server) |
| **Total (basic)** | **$0/month** |
| **Total (premium)** | **$5-22/month** |

## Effort Estimate

| Phase | Effort |
|-------|--------|
| Phase 1 (MVP) | 2-3 days |
| Phase 2 (Streaming) | 1-2 days |
| Phase 3 (Polish) | 1-2 days |
| **Total** | **4-7 days** |

## Open Questions

1. Is iPhone already on Tailscale? Need to verify connectivity
2. Does OpenClaw gateway support custom HTTP endpoints / plugins?
3. Kokoro current setup — is it running as API or CLI?
4. Preferred voice/language (Spanish? English? Both?)
5. Should talk mode maintain its own chat session or use the main one?

## Key Decisions Needed

- **PWA vs native**: PWA recommended (cross-device, no install), but iPhone Safari has audio quirks
- **Push-to-talk vs continuous**: Start with push-to-talk (simpler, less error-prone)
- **Kokoro vs ElevenLabs default**: Start free with Kokoro, upgrade path to ElevenLabs
