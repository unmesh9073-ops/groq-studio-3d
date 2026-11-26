import { useCallback, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Compass,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Trash2,
  Volume2,
  X,
} from 'lucide-react'
import { speakJarvisText } from '@/services/jarvisVoice'
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap'
import { selectAppMode, usePlaygroundStore } from '@/store/usePlaygroundStore'
import type { JarvisVoiceName } from '@/types/playground'

const VOICE_OPTIONS: Array<{ id: JarvisVoiceName; label: string }> = [
  { id: 'daniel', label: 'Daniel (Classic J.A.R.V.I.S.)' },
  { id: 'troy', label: 'Troy (Warm Baritone)' },
  { id: 'austin', label: 'Austin (Crisp Studio)' },
  { id: 'autumn', label: 'Autumn (Calm Alto)' },
  { id: 'diana', label: 'Diana (Clear Soprano)' },
  { id: 'hannah', label: 'Hannah (Bright Natural)' },
]

function SettingsModalDialog() {
  const setSettingsOpen = usePlaygroundStore((state) => state.setSettingsOpen)
  const storedApiKey = usePlaygroundStore((state) => state.apiKey)
  const setApiKey = usePlaygroundStore((state) => state.setApiKey)
  const clearApiKey = usePlaygroundStore((state) => state.clearApiKey)
  const jarvisVoiceName = usePlaygroundStore((state) => state.jarvisVoiceName)
  const jarvisVoiceAutoSpeak = usePlaygroundStore((state) => state.jarvisVoiceAutoSpeak)
  const setJarvisVoiceName = usePlaygroundStore((state) => state.setJarvisVoiceName)
  const setJarvisVoiceAutoSpeak = usePlaygroundStore((state) => state.setJarvisVoiceAutoSpeak)
  const startTour = usePlaygroundStore((state) => state.startTour)
  const mode = usePlaygroundStore(selectAppMode)

  const [draftKey, setDraftKey] = useState(storedApiKey)
  const [showKey, setShowKey] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => setSettingsOpen(false), [setSettingsOpen])
  useModalFocusTrap(dialogRef, handleClose)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const cleaned = draftKey.trim()
    setApiKey(cleaned)
    if (cleaned.length > 0) {
      setFeedback('API key saved locally — Live Groq API mode is active.')
      setSettingsOpen(false)
    } else {
      setFeedback('Empty key saved — running in Instant Demo Mode.')
    }
  }

  const handleClear = () => {
    clearApiKey()
    setDraftKey('')
    setFeedback('API key cleared — returned to Instant Demo Mode.')
  }

  const isLive = mode === 'live'

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      data-testid="settings-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Dimming Scrim */}
      <div
        onClick={() => setSettingsOpen(false)}
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'var(--glass-scrim)' }}
        aria-hidden="true"
      />

      {/* Frosted Glass Card */}
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="spatial-glass-elevated spatial-scroll relative z-10 max-h-[90vh] w-full max-w-[490px] overflow-y-auto rounded-[28px] p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--glass-border-strong)] bg-[var(--glass-bg-pill)] text-[var(--accent-cyan)]">
              <KeyRound className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
              >
                Studio Connection
              </h2>
              <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                <span
                  className={[
                    'h-2 w-2 rounded-full',
                    isLive ? 'bg-[var(--accent-emerald)]' : 'bg-[var(--accent-amber)]',
                  ].join(' ')}
                />
                <span>
                  {isLive ? 'Live Groq API Mode' : 'Instant Demo Mode (No Key Needed)'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            aria-label="Close Settings"
            data-testid="settings-close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Beginner Explanation */}
        <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
          Explore immediately in{' '}
          <span className="font-medium text-[var(--text-primary)]">Instant Demo Mode</span>,
          or paste a free Groq API key from{' '}
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[var(--accent-cyan)] underline decoration-[var(--accent-cyan)]/40 underline-offset-2 hover:decoration-[var(--accent-cyan)]"
          >
            console.groq.com/keys
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>{' '}
          to unlock live LPU speed and voice.
        </p>

        {/* Key Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="groq-api-key-input"
              className="block text-[12px] font-medium text-[var(--text-primary)]"
            >
              Groq API Key
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 focus-within:border-[var(--accent-cyan)]">
              <input
                id="groq-api-key-input"
                data-testid="api-key-input"
                type={showKey ? 'text' : 'password'}
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder="gsk_••••••••••••••••••••••••"
                autoComplete="off"
                spellCheck={false}
                className="font-mono-metric w-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                data-testid="toggle-key-visibility"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {feedback && (
            <p
              role="status"
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-3 py-2 text-[12px] text-[var(--accent-cyan)]"
            >
              {feedback}
            </p>
          )}

          {/* Privacy Note */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] p-3.5">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-emerald)]"
              aria-hidden="true"
            />
            <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
              <strong className="font-medium text-[var(--text-primary)]">
                Local-only privacy:
              </strong>{' '}
              Your key is saved strictly inside this browser&apos;s{' '}
              <code className="font-mono-metric text-[11px]">localStorage</code> and never
              transmitted to any third-party backend.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleClear}
              data-testid="clear-api-key"
              className="flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-4 py-2 text-[12.5px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear Key (Demo Mode)</span>
            </button>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              data-testid="save-api-key"
              className="rounded-full bg-[var(--accent-cyan)] px-5 py-2 text-[12.5px] font-semibold text-slate-950 shadow-sm transition-opacity hover:opacity-90"
            >
              Save Key
            </motion.button>
          </div>
        </form>

        {/* J.A.R.V.I.S. Voice & Tour Preferences */}
        <div className="mt-5 space-y-3 border-t border-[var(--glass-border)] pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-[var(--accent-cyan)]" aria-hidden="true" />
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                J.A.R.V.I.S. Voice
              </h3>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={jarvisVoiceAutoSpeak}
              onClick={() => setJarvisVoiceAutoSpeak(!jarvisVoiceAutoSpeak)}
              data-testid="settings-auto-speak-toggle"
              className="flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-3 py-1 text-[11px] font-medium text-[var(--text-primary)]"
            >
              <span>Auto-Speak Replies</span>
              <span
                className={[
                  'h-2 w-2 rounded-full',
                  jarvisVoiceAutoSpeak
                    ? 'bg-[var(--accent-emerald)]'
                    : 'bg-[var(--text-muted)]',
                ].join(' ')}
              />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="J.A.R.V.I.S. Voice Persona"
              data-testid="voice-persona-select"
              value={jarvisVoiceName}
              onChange={(e) => setJarvisVoiceName(e.target.value as JarvisVoiceName)}
              className="flex-1 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[12px] text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none"
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                void speakJarvisText(
                  'Good evening. Groq Studio 3D systems are calibrated and ready.'
                )
              }
              data-testid="test-voice-button"
              className="shrink-0 rounded-xl border border-[var(--glass-border-strong)] bg-[var(--glass-bg-pill)] px-3 py-2 text-[12px] font-medium text-[var(--accent-cyan)] transition-colors hover:bg-[var(--glass-bg-pill-hover)]"
            >
              Test Voice
            </button>
          </div>

          <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
            Live API key unlocks Groq{' '}
            <code className="font-mono-metric">whisper-large-v3-turbo</code> STT +{' '}
            <code className="font-mono-metric">canopylabs/orpheus-v1-english</code> TTS; Demo
            Mode uses built-in browser voice automatically.
          </p>

          <button
            type="button"
            onClick={startTour}
            data-testid="replay-tour-button"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] py-2 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--glass-border-strong)] hover:bg-[var(--glass-bg-pill-hover)]"
          >
            <Compass className="h-3.5 w-3.5 text-[var(--accent-cyan)]" aria-hidden="true" />
            <span>Replay 3D Welcome Tour</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function SettingsModal() {
  const isSettingsOpen = usePlaygroundStore((state) => state.isSettingsOpen)

  return (
    <AnimatePresence>
      {isSettingsOpen && <SettingsModalDialog key="settings-modal-dialog" />}
    </AnimatePresence>
  )
}
