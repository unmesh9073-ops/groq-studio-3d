import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  Mic,
  MicOff,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react'
import { getConceptById, getModelById } from '@/data/concepts'
import { isTextInputFocused } from '@/hooks/useModalFocusTrap'
import { JarvisOrb } from '@/components/jarvis/JarvisOrb'
import { getDynamicQuickAsks, sendJarvisMessage, stopJarvisTurn } from '@/services/jarvisAgent'
import {
  speakJarvisText,
  startJarvisListening,
  stopJarvisListening,
  stopJarvisSpeaking,
} from '@/services/jarvisVoice'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import type { JarvisStatus } from '@/types/playground'

function getStatusLabel(status: JarvisStatus, listening: boolean): string {
  if (listening) return 'Listening…'
  switch (status) {
    case 'thinking':
      return 'Analyzing Stage'
    case 'acting':
      return 'Executing Action'
    case 'speaking':
      return 'Speaking'
    default:
      return 'Standing By'
  }
}

export function JarvisDrawerShell() {
  const theme = usePlaygroundStore((state) => state.theme)
  const isJarvisOpen = usePlaygroundStore((state) => state.isJarvisOpen)
  const jarvisStatus = usePlaygroundStore((state) => state.jarvisStatus)
  const jarvisActionModeEnabled = usePlaygroundStore((state) => state.jarvisActionModeEnabled)
  const jarvisMessages = usePlaygroundStore((state) => state.jarvisMessages)
  const jarvisVoiceAutoSpeak = usePlaygroundStore((state) => state.jarvisVoiceAutoSpeak)
  const jarvisListening = usePlaygroundStore((state) => state.jarvisListening)
  const jarvisAudioLevel = usePlaygroundStore((state) => state.jarvisAudioLevel)
  const voiceStatusHint = usePlaygroundStore((state) => state.voiceStatusHint)
  const activeConcept = usePlaygroundStore((state) => state.activeConcept)
  const model = usePlaygroundStore((state) => state.model)
  const temperature = usePlaygroundStore((state) => state.temperature)

  const setJarvisOpen = usePlaygroundStore((state) => state.setJarvisOpen)
  const setJarvisActionModeEnabled = usePlaygroundStore(
    (state) => state.setJarvisActionModeEnabled
  )
  const setJarvisVoiceAutoSpeak = usePlaygroundStore((state) => state.setJarvisVoiceAutoSpeak)
  const revertJarvisAction = usePlaygroundStore((state) => state.revertJarvisAction)
  const clearJarvisMessages = usePlaygroundStore((state) => state.clearJarvisMessages)

  const [draft, setDraft] = useState('')
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastSpokenIdRef = useRef<string | null>(null)

  const handleCloseDrawer = () => {
    stopJarvisSpeaking()
    stopJarvisListening()
    setJarvisOpen(false)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
        if (event.ctrlKey && !event.metaKey && isTextInputFocused()) return
        event.preventDefault()
        const state = usePlaygroundStore.getState()
        if (state.isJarvisOpen) {
          stopJarvisSpeaking()
          stopJarvisListening()
        }
        state.toggleJarvisOpen()
      } else if (event.key === 'Escape') {
        const state = usePlaygroundStore.getState()
        if (state.isSettingsOpen || state.isCodeModalOpen || state.isSchemaModalOpen) {
          return
        }
        if (state.isJarvisOpen) {
          stopJarvisSpeaking()
          stopJarvisListening()
          setJarvisOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setJarvisOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [jarvisMessages.length, jarvisStatus])

  // Auto-speak newest assistant reply when enabled and drawer is open
  useEffect(() => {
    if (!isJarvisOpen || !jarvisVoiceAutoSpeak || jarvisMessages.length === 0) return
    const latest = jarvisMessages[jarvisMessages.length - 1]
    if (latest.role === 'assistant' && lastSpokenIdRef.current !== latest.id) {
      lastSpokenIdRef.current = latest.id
      void speakJarvisText(latest.content)
    }
  }, [isJarvisOpen, jarvisVoiceAutoSpeak, jarvisMessages])

  const conceptMeta = getConceptById(activeConcept)
  const modelMeta = getModelById(model)
  const quickAsks = getDynamicQuickAsks(activeConcept)
  const isBusy = jarvisStatus === 'thinking' || jarvisStatus === 'acting'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.trim() || isBusy) return
    const text = draft
    setDraft('')
    void sendJarvisMessage(text)
  }

  const handleQuickAsk = (prompt: string) => {
    if (isBusy) return
    void sendJarvisMessage(prompt)
  }

  const handleToggleMic = () => {
    if (jarvisListening) {
      stopJarvisListening()
    } else {
      void startJarvisListening((interim) => {
        if (interim) setDraft(interim)
      })
    }
  }

  const handleToggleVoiceAutoSpeak = () => {
    const next = !jarvisVoiceAutoSpeak
    setJarvisVoiceAutoSpeak(next)
    if (!next) {
      stopJarvisSpeaking()
      setSpeakingMsgId(null)
    }
  }

  const handleReplayMessage = (msgId: string, content: string) => {
    if (jarvisStatus === 'speaking' && speakingMsgId === msgId) {
      stopJarvisSpeaking()
      setSpeakingMsgId(null)
      return
    }
    setSpeakingMsgId(msgId)
    void speakJarvisText(content).finally(() => {
      setSpeakingMsgId((cur) => (cur === msgId ? null : cur))
    })
  }

  return (
    <AnimatePresence>
      {isJarvisOpen && (
        <motion.aside
          id="jarvis-drawer"
          role="complementary"
          aria-label="J.A.R.V.I.S. Assistant Drawer"
          data-testid="jarvis-drawer"
          initial={{ x: '108%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '108%', opacity: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.36 }}
          className="spatial-glass-elevated select-none fixed right-4 top-[116px] lg:top-[78px] bottom-4 z-30 flex w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-[26px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-1.5 border-b border-[var(--glass-border)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <JarvisOrb
                status={jarvisListening ? 'acting' : jarvisStatus}
                theme={theme}
                size={44}
                audioLevel={jarvisAudioLevel}
              />
              <div className="min-w-0">
                <h2 className="truncate text-[14px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
                  J.A.R.V.I.S.
                </h2>
                <p
                  data-testid="jarvis-status-label"
                  className={[
                    'text-[11px] font-medium',
                    jarvisListening ? 'text-[var(--accent-amber)]' : 'text-[var(--accent-cyan)]',
                  ].join(' ')}
                >
                  {getStatusLabel(jarvisStatus, jarvisListening)}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {/* Action Mode Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={jarvisActionModeEnabled}
                onClick={() => setJarvisActionModeEnabled(!jarvisActionModeEnabled)}
                data-testid="jarvis-action-mode-toggle"
                title={
                  jarvisActionModeEnabled
                    ? 'Hands-On Action Mode: J.A.R.V.I.S. can adjust sliders & run demos'
                    : 'Advice Only: J.A.R.V.I.S. explains without changing controls'
                }
                className={[
                  'flex items-center gap-1 rounded-full border px-2 py-1 text-[10.5px] font-medium transition-colors',
                  jarvisActionModeEnabled
                    ? 'border-[var(--accent-cyan)]/45 bg-[var(--accent-cyan)]/14 text-[var(--accent-cyan)]'
                    : 'border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                <Wrench className="h-3 w-3" aria-hidden="true" />
                <span>{jarvisActionModeEnabled ? 'Hands-On' : 'Advice Only'}</span>
              </button>

              {/* Voice Reply Speaker Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={jarvisVoiceAutoSpeak}
                onClick={handleToggleVoiceAutoSpeak}
                data-testid="jarvis-voice-toggle"
                aria-label={jarvisVoiceAutoSpeak ? 'Mute J.A.R.V.I.S. voice' : 'Unmute J.A.R.V.I.S. voice'}
                title={jarvisVoiceAutoSpeak ? 'Audio On (auto-speak replies)' : 'Muted'}
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                  jarvisVoiceAutoSpeak
                    ? 'border-[var(--accent-cyan)]/40 bg-[var(--glass-bg-pill)] text-[var(--accent-cyan)]'
                    : 'border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                {jarvisVoiceAutoSpeak ? (
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>

              {jarvisMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    stopJarvisSpeaking()
                    clearJarvisMessages()
                  }}
                  aria-label="Clear J.A.R.V.I.S. chat"
                  title="Clear chat"
                  data-testid="jarvis-clear-chat"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}

              <motion.button
                type="button"
                onClick={handleCloseDrawer}
                whileTap={{ scale: 0.92 }}
                aria-label="Close J.A.R.V.I.S. drawer"
                data-testid="jarvis-close"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </motion.button>
            </div>
          </div>

          {/* Live Context Ribbon */}
          <div className="border-b border-[var(--glass-border)] px-4 py-2">
            <div
              data-testid="jarvis-context-ribbon"
              className="flex items-center gap-1.5 truncate rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-3 py-1 text-[11px] text-[var(--text-secondary)]"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-emerald)]"
                aria-hidden="true"
              />
              <span className="truncate">
                Seeing: <strong className="font-medium text-[var(--text-primary)]">{conceptMeta.shortLabel}</strong> ·{' '}
                <span className="font-mono-metric">T {temperature.toFixed(2)}</span> ·{' '}
                <span className="font-mono-metric">{modelMeta.label}</span>
              </span>
            </div>
          </div>

          {/* Message Stream / Empty State */}
          <div className="spatial-scroll select-text flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {jarvisMessages.length === 0 ? (
              <div className="flex flex-1 flex-col justify-center gap-4">
                <div className="rounded-[20px] border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] p-4">
                  <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">
                    Good evening. I am watching your 3D stage live—ask me by text or voice to
                    explain any dial, spotlight a setting, or run a hands-on Groq Playground
                    demonstration.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                    <Sparkles className="h-3 w-3 text-[var(--accent-cyan)]" aria-hidden="true" />
                    <span>Quick Stage Experiments</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {quickAsks.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleQuickAsk(prompt)}
                        data-testid="jarvis-quick-ask"
                        className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-3.5 py-2 text-left text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent-cyan)]/45 hover:bg-[var(--glass-bg-pill-hover)]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {jarvisMessages.map((msg) => {
                  const isUser = msg.role === 'user'
                  const isThisSpeaking =
                    jarvisStatus === 'speaking' && speakingMsgId === msg.id
                  return (
                    <div
                      key={msg.id}
                      data-testid={`jarvis-message-${msg.role}`}
                      className={[
                        'flex flex-col gap-2',
                        isUser ? 'items-end' : 'items-start',
                      ].join(' ')}
                    >
                      <div
                        className={[
                          'max-w-[92%] rounded-[18px] px-3.5 py-2.5 text-[12.5px] leading-relaxed',
                          isUser
                            ? 'bg-[var(--accent-cyan)] font-medium text-slate-950'
                            : 'border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-primary)]',
                        ].join(' ')}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* Action Mode Receipts + Undo */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[var(--glass-border)] pt-2">
                            {msg.actions.map((act) => (
                              <span
                                key={act.id}
                                data-testid="jarvis-action-receipt"
                                className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-emerald)]/40 bg-[var(--accent-emerald)]/12 px-2 py-0.5 text-[10.5px] font-medium text-[var(--accent-emerald)]"
                              >
                                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                <span>
                                  {act.label}: {act.detail}
                                </span>
                              </span>
                            ))}
                            {msg.preActionSnapshot && (
                              msg.snapshotReverted ? (
                                <span
                                  data-testid="jarvis-action-reverted"
                                  className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--text-muted)]"
                                >
                                  Reverted
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => revertJarvisAction(msg.id)}
                                  data-testid="jarvis-undo-action"
                                  aria-label="Undo J.A.R.V.I.S. changes"
                                  className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border-strong)] bg-[var(--glass-bg)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent-cyan)]/55 hover:text-[var(--accent-cyan)]"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
                                  <span>Undo</span>
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {!isUser && (
                          <div className="mt-2 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleReplayMessage(msg.id, msg.content)}
                              data-testid="jarvis-replay-audio"
                              aria-label={isThisSpeaking ? 'Stop speaking' : 'Replay audio'}
                              className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-cyan)]/45 hover:text-[var(--text-primary)]"
                            >
                              {isThisSpeaking ? (
                                <>
                                  <Square className="h-2.5 w-2.5 fill-current text-[var(--accent-amber)]" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-2.5 w-2.5 text-[var(--accent-cyan)]" />
                                  <span>Speak</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Follow-up Chips */}
                      {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedFollowUps.map((followUp) => (
                            <button
                              key={followUp}
                              type="button"
                              onClick={() => handleQuickAsk(followUp)}
                              className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-[10.5px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-cyan)]/40 hover:text-[var(--text-primary)]"
                            >
                              {followUp}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {isBusy && (
                  <div className="flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-3.5 py-2 text-[12px] text-[var(--text-secondary)]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-cyan)]" />
                    <span>
                      {jarvisStatus === 'acting'
                        ? 'Adjusting Playground stage…'
                        : 'Thinking…'}
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Voice Status Hint & Composer */}
          <form onSubmit={handleSubmit} className="border-t border-[var(--glass-border)] p-3.5">
            {voiceStatusHint && (
              <p
                data-testid="jarvis-voice-hint"
                className="mb-2 truncate px-1 text-[11px] text-[var(--text-muted)]"
              >
                {voiceStatusHint}
              </p>
            )}

            <div className="flex items-center gap-2 rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 focus-within:border-[var(--accent-cyan)]">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                data-testid="jarvis-input"
                aria-label="Ask J.A.R.V.I.S."
                placeholder={
                  jarvisListening
                    ? 'Listening… click mic to send'
                    : 'Ask J.A.R.V.I.S. or click mic to talk…'
                }
                className="select-text w-full bg-transparent text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />

              <button
                type="button"
                onClick={handleToggleMic}
                disabled={isBusy}
                title={jarvisListening ? 'Stop listening and send' : 'Talk to J.A.R.V.I.S.'}
                aria-label={jarvisListening ? 'Stop listening' : 'Talk to J.A.R.V.I.S.'}
                data-testid="jarvis-mic-button"
                className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all',
                  jarvisListening
                    ? 'animate-pulse bg-rose-500/25 text-rose-400 ring-1 ring-rose-400/60'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--accent-cyan)]',
                ].join(' ')}
              >
                {jarvisListening ? (
                  <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>

              {isBusy ? (
                <button
                  type="button"
                  onClick={stopJarvisTurn}
                  aria-label="Stop J.A.R.V.I.S."
                  data-testid="jarvis-stop"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-rose-500/45 bg-rose-500/20 text-rose-400 transition-colors hover:bg-rose-500/30"
                >
                  <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label="Send message to J.A.R.V.I.S."
                  data-testid="jarvis-send"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-cyan)] text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <SendHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
