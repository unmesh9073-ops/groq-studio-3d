import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import type { FinishReason } from '@/types/playground'

function getFinishReasonExplanation(
  reason: FinishReason,
  maxTokens: number,
  triggeredStop: string | null
): string {
  switch (reason) {
    case 'stop':
      return 'Natural completion: the model finished its answer.'
    case 'length':
      return `Token cap hit: stopped at Max Completion Tokens (${maxTokens}).`
    case 'stop_sequence':
      return `Stop sequence matched (${triggeredStop ?? 'custom'}): halted immediately.`
    case 'aborted':
      return 'Aborted: stopped manually before completion.'
    default:
      return 'Generation finish status.'
  }
}

function getFinishReasonBadgeClass(reason: FinishReason): string {
  switch (reason) {
    case 'length':
    case 'stop_sequence':
      return 'border-[var(--accent-amber)]/45 bg-[var(--accent-amber)]/12 text-[var(--accent-amber)]'
    case 'aborted':
      return 'border-rose-500/40 bg-rose-500/12 text-[var(--accent-rose)]'
    case 'stop':
      return 'border-[var(--accent-emerald)]/40 bg-[var(--accent-emerald)]/12 text-[var(--accent-emerald)]'
    default:
      return 'border-[var(--glass-border)] text-[var(--text-muted)]'
  }
}

export function TelemetryBar() {
  const executionStatus = usePlaygroundStore((state) => state.executionStatus)
  const telemetry = usePlaygroundStore((state) => state.telemetry)
  const maxCompletionTokens = usePlaygroundStore((state) => state.maxCompletionTokens)
  const apiKey = usePlaygroundStore((state) => state.apiKey)

  const isStreaming = executionStatus === 'streaming'
  const isConnecting = executionStatus === 'connecting'
  const sourceLabel =
    (telemetry.source ?? (apiKey.trim().length > 0 ? 'live' : 'demo')) === 'live'
      ? 'Live Groq LPU'
      : 'Simulated LPU'

  const ttftDisplay =
    telemetry.ttftMs !== null
      ? `${telemetry.ttftMs} ms`
      : isConnecting
        ? '…'
        : '—'

  const speedDisplay =
    telemetry.tokensPerSecond !== null ? `${telemetry.tokensPerSecond} tok/s` : '—'

  const tokensDisplay =
    telemetry.completionTokens !== null
      ? `${telemetry.promptTokens ?? 0} + ${telemetry.completionTokens} / ${maxCompletionTokens}`
      : `0 / ${maxCompletionTokens}`

  return (
    <div
      data-testid="telemetry-bar"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--glass-border)] px-4 py-2 text-[11px]"
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* TTFT */}
        <div
          className="flex items-center gap-1.5"
          title="Time to First Token: how fast the LPU starts replying"
        >
          <span className="text-[var(--text-muted)]">TTFT</span>
          <span
            data-testid="telemetry-ttft"
            className="font-mono-metric font-medium text-[var(--text-primary)]"
          >
            {ttftDisplay}
          </span>
        </div>

        <span className="h-3 w-px bg-[var(--glass-border)]" aria-hidden="true" />

        {/* Speed (tok/s) */}
        <div
          className="flex items-center gap-1.5"
          title="Decode throughput in tokens per second"
        >
          <span className="text-[var(--text-muted)]">Speed</span>
          <span
            data-testid="telemetry-speed"
            className={[
              'font-mono-metric font-semibold transition-all',
              isStreaming
                ? 'text-[var(--accent-amber)] drop-shadow-[0_0_8px_rgba(245,158,11,0.55)]'
                : 'text-[var(--text-primary)]',
            ].join(' ')}
          >
            {speedDisplay}
          </span>
        </div>

        <span className="h-3 w-px bg-[var(--glass-border)]" aria-hidden="true" />

        {/* Tokens (in + out / max) */}
        <div
          className="flex items-center gap-1.5"
          title="Prompt tokens + Completion tokens / Max Completion Tokens"
        >
          <span className="text-[var(--text-muted)]">Tokens</span>
          <span
            data-testid="telemetry-tokens"
            className="font-mono-metric font-medium text-[var(--text-primary)]"
          >
            {tokensDisplay}
          </span>
        </div>

        {/* Finish Reason */}
        {telemetry.finishReason && (
          <>
            <span className="h-3 w-px bg-[var(--glass-border)]" aria-hidden="true" />
            <span
              data-testid="telemetry-finish-reason"
              title={getFinishReasonExplanation(
                telemetry.finishReason,
                maxCompletionTokens,
                telemetry.triggeredStopSequence
              )}
              className={[
                'font-mono-metric rounded-full border px-2 py-0.5 text-[10px] font-medium',
                getFinishReasonBadgeClass(telemetry.finishReason),
              ].join(' ')}
            >
              {telemetry.finishReason}
              {telemetry.finishReason === 'stop_sequence' && telemetry.triggeredStopSequence
                ? ` (${telemetry.triggeredStopSequence.replace(/\n/g, '↵')})`
                : ''}
            </span>
          </>
        )}
      </div>

      {/* Source Pill */}
      <span
        data-testid="telemetry-source"
        className="flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-2.5 py-0.5 text-[10.5px] font-medium text-[var(--text-secondary)]"
      >
        <span
          className={[
            'h-1.5 w-1.5 rounded-full',
            sourceLabel === 'Live Groq LPU'
              ? 'bg-[var(--accent-emerald)]'
              : 'bg-[var(--accent-amber)]',
          ].join(' ')}
          aria-hidden="true"
        />
        <span>{sourceLabel}</span>
      </span>
    </div>
  )
}
