# Groq Studio 3D (Version 2)

An Apple Vision Pro-inspired spatial 3D playground and interactive learning studio for **Groq LPU** inference.

## Spatial Architecture (4 Workspaces)

- **Studio**: Airy editorial home hub with the live 3D LPU Deterministic Core and 7 interactive Concept Portal Cards.
- **3D Lab**: Distraction-free 3D learning stage with 7 interactive Three.js diagrams (`LPU Pipeline`, `Roles & Prefill`, `Temperature`, `Top-P`, `Token Limits`, `JSON Schema`, `Built-In Tools`), contextual bottom `LabOrnament` controls, and 7 hands-on Mini-Challenges with `localStorage` mastery tracking.
- **Playground**: Floating visionOS glass studio with live TTFT & tok/s telemetry, on-demand `Tune` parameter popover, `/openai/v1/chat/completions` payload preview, and streaming output canvas.
- **Builder**: Dedicated 3-tab studio for **JSON Schema** authoring, server-side **Built-In Tools** (`browser_search`, `code_interpreter`), and live **4-SDK Code Export** (`Python groq`, `TypeScript groq-sdk`, `OpenAI Compat`, `cURL`).
- **J.A.R.V.I.S. Co-Pilot**: Summonable via `Cmd/Ctrl + J` with two-way voice (`whisper-large-v3-turbo` STT + `canopylabs/orpheus-v1-english` TTS) and spatial **Action Mode** with **Undo**.

## Quick Start

```bash
npm install
npm run dev
```

## Instant Demo Mode vs. Live Groq API

Groq Studio 3D works out-of-the-box in **Instant Demo Mode** with simulated LPU streaming and telemetry—no API key required. To run live completions against Groq, open **Settings** in the top bar and paste your `gsk_...` key (stored locally in `localStorage` in your browser, never committed or sent to any third-party server).
