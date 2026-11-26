# Groq Studio 3D

**An interactive 3D spatial playground for learning how the Groq Developer Playground and LPU™ inference work in real time.**

Built with React 19, TypeScript, Three.js (`@react-three/fiber` + `@react-three/drei`), Framer Motion, Zustand, and an Apple Spatial Glass UI in both **Dark Obsidian** and **Light Studio** modes.

---

## Key Features

- **7 Interactive 3D Concept Diagrams:**
  1. **LPU Pipeline** — Input emitter, deterministic on-chip SRAM LPU core, and streaming vs. batched output prisms.
  2. **Prompt Roles** — System instructions, User prompt prism, and Assistant Prefill launch rail.
  3. **Temperature** — Real-time 3D Softmax probability pillars showing how `0.0 → 2.0` reshapes token selection.
  4. **Top-P (Nucleus)** — Interactive glass cutoff curtain slicing the candidate token pool.
  5. **Token Limits** — Max Completion Tokens wall and Stop Sequence laser gate.
  6. **JSON Schema** — Constrained decoding lattice synced live with the JSON Schema Editor.
  7. **Built-In Tools** — Bidirectional server-side conduits for Browser Search and Python Code Sandbox (`openai/gpt-oss-*`).
- **4-SDK Live Code Export (`⌘/Ctrl + E`):** Generates runnable **Python (`groq`)**, **TypeScript (`groq-sdk`)**, **OpenAI-compatible**, and **cURL** snippets matching every parameter, schema, and tool.
- **J.A.R.V.I.S. Spatial Co-Pilot (`⌘/Ctrl + J`):** Context-aware assistant with **Hands-On Action Mode** (adjusts dials, spotlights controls, runs live demos, with 1-click **Undo**), **Advice Only** mode, and voice I/O (`whisper-large-v3-turbo` STT + `orpheus-v1-english` TTS, with browser speech fallback).

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Instant Demo Mode vs. Live Groq API Key

- **Instant Demo Mode (Zero Setup):** Works immediately out of the box with no account or API key required—simulating TTFT, tokens/sec, stop sequences, structured JSON, and server-side tool traces.
- **Live Groq API Mode:** Click **Demo Mode** (top-left) or **Settings** (gear icon) and paste a free API key from [console.groq.com/keys](https://console.groq.com/keys).
  - **Local-Only Privacy:** Your API key is stored strictly in your browser's `localStorage` and sent only to `https://api.groq.com/openai/v1/*`.
  - **Zero Server Env Vars Required:** All inference runs client-side, and exported SDK snippets always reference `GROQ_API_KEY` from your environment without ever embedding your key.
