# 🧪⚡ GroqLab: The Interactive LLM Exploratorium
> **Demystifying how Large Language Models actually work under the hood — powered by ultra-fast Groq LPUs.**

GroqLab is a playful, tactile, and deeply educational "AI Science Lab" web application designed for complete beginners to explore how AI language models think, predict, and generate text.

Instead of hiding the technology behind a standard chat box, GroqLab puts the model onto an interactive dissection table.

---

## 🔬 The 6 Interactive Science Lab Stations

1. **Station 1: The Token Microscope 🔬 ("Words are an Illusion")**
   - Uncover Byte Pair Encoding (BPE).
   - See how words get sliced into numeric Token IDs.
   - Crack the famous **Strawberry Paradox**: why models fail to count letters in "strawberry" unless prompted to break into single-character tokens.

2. **Station 2: The Next-Token Crystal Ball 🔮 ("Logprobs & Predictions")**
   - Peek inside the model's prediction engine using Groq `logprobs: true` and `top_logprobs: 5`.
   - Inspect alternative words the model considered at every single millisecond.
   - **The Multiverse Fork**: Click any alternative word to branch reality into an alternate universe!

3. **Station 3: The Temperature & Chaos Dial 🎛️ ("Cold Math vs Wild Dreams")**
   - Demystify Temperature ($T$) and Top-P (nucleus sampling).
   - Dynamic real-time Softmax Probability Curve visualizer.
   - **Dual-Chamber Comparator**: Run Chamber A ($T=0.0$, robot determinism) against Chamber B ($T=1.8$, chaotic fever dream) side-by-side with Groq's sub-second speed!

4. **Station 4: The Context Memory Meter 🧠 ("The Infinite Amnesia Machine")**
   - Dispel the beginner myth that AI "remembers" you.
   - X-Ray Context Tank showing the raw accumulated token payload re-sent on every single turn.
   - **The Amnesia Scissors**: Snip a past message out of memory and watch the AI instantly forget who you are!

5. **Station 5: The System Prompt Puppet Strings 🎭 ("Steering the AI's Mind")**
   - See how invisible instructions transform the same model into a 17th-century Pirate, a Kindergarten Teacher, or a strict JSON API.
   - **The Vault Keeper Challenge**: Try tricky prompts to make the model leak its secret password `BANANA_BREAD`!

6. **Station 6: The Groq LPU Speedometer ⚡ ("The Need for Speed")**
   - Discover why Groq's Tensor Streaming LPUs with on-chip SRAM outperform traditional GPU clouds.
   - Real-time Tachometer: Tokens/Second, Time-to-First-Token (TTFT), and latency.
   - **The Great Speed Race**: Watch Human Reading (~4.5 tok/s) vs Cloud GPU (~35 tok/s) vs Groq LPU (~650+ tok/s) race in real-time!

7. **Lab Quizzes & Certification 🏆**
   - 4 hands-on challenges and quizzes with instant feedback and confetti celebrations.

---

## 🔒 Strict Security Architecture

- **Zero Client-Side Key Exposure:** No `NEXT_PUBLIC_GROQ_API_KEY` is ever used.
- **Server Route Handlers:** All calls to Groq API route through Next.js server proxies (`/api/groq/chat`, `/api/groq/logprobs`, `/api/groq/verify`).
- **Bring Your Own Key (BYOK):** Users can enter their free Groq API key in the UI. It is stored strictly in browser `sessionStorage` (cleared when closing the tab) and transmitted via secure `x-groq-api-key` headers.
- **Zero-Friction Simulation Mode:** If no key is provided, the app automatically runs in **Simulation Mode** with high-fidelity pre-computed data, ensuring anyone can explore immediately without creating an account!

---

## 🚀 Getting Started Locally

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Set your Groq API key in .env.local
echo "GROQ_API_KEY=gsk_your_key_here" > .env.local

# 3. Start the dev server
npm run dev

# 4. Open in browser
http://localhost:3000
```

---

## ☁️ Deploying to Vercel in 2 Minutes

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "Deploy GroqLab"
   git push origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Under **Environment Variables**, optionally add:
   - `GROQ_API_KEY` = your Groq API key from [console.groq.com/keys](https://console.groq.com/keys)
4. Click **Deploy**!
