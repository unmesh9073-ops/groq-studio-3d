import { sendJarvisMessage } from '@/services/jarvisAgent'
import { deriveAppMode, usePlaygroundStore } from '@/store/usePlaygroundStore'

interface BrowserSpeechRecognitionEvent {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

interface BrowserSpeechRecognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  return win.AudioContext ?? win.webkitAudioContext ?? null
}

export function sanitizeSpeechText(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/```[\s\S]*?```/g, 'code snippet')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/#+\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function chunkTextForOrpheus(raw: string, maxLen = 185): string[] {
  const clean = sanitizeSpeechText(raw)
  if (!clean) return []
  if (clean.length <= maxLen) return [clean]

  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean]
  const chunks: string[] = []
  let current = ''

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim()
    if (!sentence) continue

    if (current && current.length + 1 + sentence.length <= maxLen) {
      current = `${current} ${sentence}`
      continue
    }

    if (current) {
      chunks.push(current)
      current = ''
    }

    if (sentence.length <= maxLen) {
      current = sentence
    } else {
      const words = sentence.split(/\s+/)
      for (const word of words) {
        if (!current) {
          current = word.slice(0, maxLen)
        } else if (current.length + 1 + word.length <= maxLen) {
          current = `${current} ${word}`
        } else {
          chunks.push(current)
          current = word.slice(0, maxLen)
        }
      }
    }
  }

  if (current) chunks.push(current)
  return chunks
}

// Active playback & recording handles
let ttsAbortController: AbortController | null = null
let activeAudioCtx: AudioContext | null = null
let activeAudioSource: AudioBufferSourceNode | null = null
let syntheticSpeechInterval: number | null = null

let activeRecorder: MediaRecorder | null = null
let activeMediaStream: MediaStream | null = null
let activeMicCtx: AudioContext | null = null
let micMeterRaf = 0
let activeRecognition: BrowserSpeechRecognition | null = null
let recognitionFinalBuffer = ''
let recognitionInterimCallback: ((text: string) => void) | null = null

export function stopJarvisSpeaking(): void {
  if (ttsAbortController) {
    ttsAbortController.abort()
    ttsAbortController = null
  }

  if (activeAudioSource) {
    try {
      activeAudioSource.stop()
    } catch {
      // Ignore already stopped source
    }
    activeAudioSource = null
  }

  if (activeAudioCtx) {
    void activeAudioCtx.close().catch(() => {})
    activeAudioCtx = null
  }

  if (syntheticSpeechInterval !== null && typeof window !== 'undefined') {
    window.clearInterval(syntheticSpeechInterval)
    syntheticSpeechInterval = null
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // Ignore headless speechSynthesis errors
    }
  }

  const store = usePlaygroundStore.getState()
  store.setJarvisAudioLevel(0)
  if (store.jarvisStatus === 'speaking') {
    store.setJarvisStatus('standby')
  }
}

function selectBritishMaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices || voices.length === 0) return null

  const preferred = ['daniel', 'arthur', 'oliver', 'google uk english male', 'ryan']
  const enGb = voices.filter((v) => v.lang.toLowerCase().startsWith('en-gb'))

  for (const name of preferred) {
    const match = enGb.find((v) => v.name.toLowerCase().includes(name))
    if (match) return match
  }

  return enGb[0] ?? voices.find((v) => v.lang.toLowerCase().startsWith('en')) ?? voices[0]
}

async function speakWithBrowserSynthesis(
  cleanText: string,
  signal: AbortSignal
): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    usePlaygroundStore.getState().setVoiceStatusHint('Browser speech synthesis unavailable.')
    return
  }

  const store = usePlaygroundStore.getState()
  store.setJarvisStatus('speaking')

  await new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }

    const utterance = new SpeechSynthesisUtterance(cleanText)
    const voice = selectBritishMaleVoice()
    if (voice) utterance.voice = voice
    utterance.rate = 1.02
    utterance.pitch = 0.95

    let tick = 0
    syntheticSpeechInterval = window.setInterval(() => {
      if (signal.aborted) return
      tick += 0.35
      const env = 0.32 + Math.abs(Math.sin(tick * 1.9)) * 0.45 + Math.abs(Math.cos(tick * 3.1)) * 0.2
      usePlaygroundStore.getState().setJarvisAudioLevel(Math.min(1, env))
    }, 65)

    const cleanup = () => {
      if (syntheticSpeechInterval !== null) {
        window.clearInterval(syntheticSpeechInterval)
        syntheticSpeechInterval = null
      }
      usePlaygroundStore.getState().setJarvisAudioLevel(0)
      resolve()
    }

    utterance.onend = cleanup
    utterance.onerror = cleanup
    signal.addEventListener('abort', cleanup, { once: true })

    try {
      window.speechSynthesis.speak(utterance)
    } catch {
      cleanup()
    }
  })
}

async function playWavBufferWithMeter(
  wavBuffer: ArrayBuffer,
  signal: AbortSignal
): Promise<void> {
  const AudioCtx = getAudioContextCtor()
  if (!AudioCtx) return

  if (!activeAudioCtx) {
    activeAudioCtx = new AudioCtx()
  }
  if (activeAudioCtx.state === 'suspended') {
    await activeAudioCtx.resume()
  }

  const decoded = await activeAudioCtx.decodeAudioData(wavBuffer.slice(0))
  const source = activeAudioCtx.createBufferSource()
  source.buffer = decoded

  const analyser = activeAudioCtx.createAnalyser()
  analyser.fftSize = 128
  const data = new Uint8Array(analyser.frequencyBinCount)

  source.connect(analyser)
  analyser.connect(activeAudioCtx.destination)
  activeAudioSource = source

  await new Promise<void>((resolve) => {
    let rafId = 0

    const updateMeter = () => {
      if (signal.aborted) return
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const norm = (data[i] - 128) / 128
        sum += norm * norm
      }
      const rms = Math.sqrt(sum / data.length)
      usePlaygroundStore.getState().setJarvisAudioLevel(Math.min(1, rms * 3.2))
      rafId = window.requestAnimationFrame(updateMeter)
    }

    const cleanup = () => {
      window.cancelAnimationFrame(rafId)
      if (activeAudioSource === source) activeAudioSource = null
      usePlaygroundStore.getState().setJarvisAudioLevel(0)
      resolve()
    }

    source.onended = cleanup
    signal.addEventListener(
      'abort',
      () => {
        try {
          source.stop()
        } catch {
          // Ignore
        }
        cleanup()
      },
      { once: true }
    )

    rafId = window.requestAnimationFrame(updateMeter)
    source.start(0)
  })
}

export async function speakJarvisText(rawText: string): Promise<void> {
  stopJarvisSpeaking()
  const clean = sanitizeSpeechText(rawText)
  if (!clean) return

  const controller = new AbortController()
  ttsAbortController = controller
  const store = usePlaygroundStore.getState()
  const mode = deriveAppMode(store.apiKey)

  try {
    if (mode === 'live') {
      store.setJarvisStatus('speaking')
      store.setVoiceStatusHint('Groq Orpheus · Speaking')
      const chunks = chunkTextForOrpheus(clean, 185)

      for (const chunk of chunks) {
        if (controller.signal.aborted) break

        const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${store.apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'canopylabs/orpheus-v1-english',
            input: chunk,
            voice: store.jarvisVoiceName,
            response_format: 'wav',
          }),
          signal: controller.signal,
        })

        if (res.status === 400 || res.status === 403 || res.status === 429) {
          usePlaygroundStore
            .getState()
            .setVoiceStatusHint(
              'Using browser voice — accept Orpheus terms in console.groq.com for Groq TTS'
            )
          await speakWithBrowserSynthesis(clean, controller.signal)
          return
        }

        if (!res.ok) {
          throw new Error(`Orpheus TTS HTTP ${res.status}`)
        }

        const buf = await res.arrayBuffer()
        if (controller.signal.aborted) break
        await playWavBufferWithMeter(buf, controller.signal)
      }
    } else {
      store.setVoiceStatusHint('Browser Voice · Demo')
      await speakWithBrowserSynthesis(clean, controller.signal)
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    usePlaygroundStore.getState().setVoiceStatusHint('Browser Voice · Fallback')
    await speakWithBrowserSynthesis(clean, controller.signal)
  } finally {
    if (ttsAbortController === controller) {
      ttsAbortController = null
    }
    if (activeAudioCtx) {
      void activeAudioCtx.close().catch(() => {})
      activeAudioCtx = null
    }
    const latest = usePlaygroundStore.getState()
    latest.setJarvisAudioLevel(0)
    if (latest.jarvisStatus === 'speaking') {
      latest.setJarvisStatus('standby')
    }
  }
}

function cleanupMicResources(): void {
  if (micMeterRaf) {
    window.cancelAnimationFrame(micMeterRaf)
    micMeterRaf = 0
  }
  if (activeMediaStream) {
    activeMediaStream.getTracks().forEach((track) => track.stop())
    activeMediaStream = null
  }
  if (activeMicCtx) {
    void activeMicCtx.close().catch(() => {})
    activeMicCtx = null
  }
  activeRecorder = null
  usePlaygroundStore.getState().setJarvisAudioLevel(0)
  usePlaygroundStore.getState().setJarvisListening(false)
}

export async function startJarvisListening(
  onInterimTranscript?: (text: string) => void
): Promise<void> {
  stopJarvisSpeaking()
  const store = usePlaygroundStore.getState()
  const mode = deriveAppMode(store.apiKey)
  recognitionInterimCallback = onInterimTranscript ?? null

  if (
    mode === 'live' &&
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  ) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      activeMediaStream = stream

      const AudioCtx = getAudioContextCtor()
      if (AudioCtx) {
        activeMicCtx = new AudioCtx()
        const src = activeMicCtx.createMediaStreamSource(stream)
        const analyser = activeMicCtx.createAnalyser()
        analyser.fftSize = 128
        const data = new Uint8Array(analyser.frequencyBinCount)
        src.connect(analyser)

        const sample = () => {
          if (!activeMediaStream) return
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const norm = (data[i] - 128) / 128
            sum += norm * norm
          }
          const rms = Math.sqrt(sum / data.length)
          usePlaygroundStore.getState().setJarvisAudioLevel(Math.min(1, rms * 3.5))
          micMeterRaf = window.requestAnimationFrame(sample)
        }
        micMeterRaf = window.requestAnimationFrame(sample)
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data)
      }

      recorder.onstop = async () => {
        const finalMime = recorder.mimeType || 'audio/webm'
        const ext = finalMime.includes('mp4') ? 'mp4' : 'webm'
        const blob = new Blob(chunks, { type: finalMime })
        cleanupMicResources()

        if (blob.size < 256) return

        const current = usePlaygroundStore.getState()
        current.setVoiceStatusHint('Groq Whisper · Transcribing…')
        current.setJarvisStatus('thinking')

        try {
          const form = new FormData()
          form.append('file', blob, `speech.${ext}`)
          form.append('model', 'whisper-large-v3-turbo')
          form.append('language', 'en')
          form.append('response_format', 'json')

          const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${current.apiKey.trim()}`,
            },
            body: form,
          })

          if (!res.ok) {
            throw new Error(`Whisper STT HTTP ${res.status}`)
          }

          const json = (await res.json()) as { text?: string }
          const transcript = json.text?.trim() ?? ''
          current.setVoiceStatusHint('Groq Whisper · Live')
          if (transcript) {
            await sendJarvisMessage(transcript)
          } else {
            current.setJarvisStatus('standby')
          }
        } catch {
          usePlaygroundStore
            .getState()
            .setVoiceStatusHint('Could not transcribe audio — try typing below.')
          usePlaygroundStore.getState().setJarvisStatus('standby')
        }
      }

      activeRecorder = recorder
      recorder.start()
      store.setJarvisListening(true)
      store.setVoiceStatusHint('Groq Whisper · Listening… Click mic to send')
      return
    } catch {
      cleanupMicResources()
      store.setVoiceStatusHint(
        'Microphone permission unavailable — type your question below.'
      )
      return
    }
  }

  // Instant Demo Mode / Fallback: Browser Web Speech API
  const RecognitionCtor = getSpeechRecognitionCtor()
  if (!RecognitionCtor) {
    store.setJarvisListening(false)
    store.setVoiceStatusHint(
      'Voice input is unsupported in this browser — type your question below.'
    )
    return
  }

  try {
    const recognition = new RecognitionCtor()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    recognitionFinalBuffer = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) {
          recognitionFinalBuffer += text
        } else {
          interim += text
        }
      }
      const combined = (recognitionFinalBuffer + interim).trim()
      if (combined) {
        recognitionInterimCallback?.(combined)
      }
      usePlaygroundStore.getState().setJarvisAudioLevel(0.45)
    }

    recognition.onerror = (ev) => {
      activeRecognition = null
      usePlaygroundStore.getState().setJarvisListening(false)
      usePlaygroundStore.getState().setJarvisAudioLevel(0)
      usePlaygroundStore
        .getState()
        .setVoiceStatusHint(
          ev.error === 'not-allowed'
            ? 'Microphone access denied — type your question below.'
            : 'Voice input paused — type your question below.'
        )
    }

    recognition.onend = () => {
      activeRecognition = null
      usePlaygroundStore.getState().setJarvisListening(false)
      usePlaygroundStore.getState().setJarvisAudioLevel(0)
      const finalText = recognitionFinalBuffer.trim()
      recognitionFinalBuffer = ''
      if (finalText) {
        recognitionInterimCallback?.('')
        void sendJarvisMessage(finalText)
      }
    }

    activeRecognition = recognition
    recognition.start()
    store.setJarvisListening(true)
    store.setVoiceStatusHint('Browser Voice · Listening… Click mic to send')
  } catch {
    activeRecognition = null
    store.setJarvisListening(false)
    store.setVoiceStatusHint(
      'Voice input unavailable in this browser — type your question below.'
    )
  }
}

export function stopJarvisListening(): void {
  if (activeRecorder && activeRecorder.state !== 'inactive') {
    activeRecorder.stop()
    return
  }
  if (activeRecognition) {
    try {
      activeRecognition.stop()
    } catch {
      activeRecognition = null
      usePlaygroundStore.getState().setJarvisListening(false)
      usePlaygroundStore.getState().setJarvisAudioLevel(0)
    }
    return
  }
  cleanupMicResources()
}
