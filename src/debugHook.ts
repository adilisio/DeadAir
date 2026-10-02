/**
 * A tiny window hook so tools/shots.mjs (and a curious player in devtools) can
 * see which phase the game is in. No game logic reads it.
 */
type Hook = { phase: string; phasesSeen: string[]; data: Record<string, unknown> };

declare global {
  interface Window {
    __deadair?: Hook;
  }
}

const hook: Hook = { phase: '', phasesSeen: [], data: {} };
if (typeof window !== 'undefined') window.__deadair = hook;

export function markPhase(phase: string): void {
  hook.phase = phase;
  if (!hook.phasesSeen.includes(phase)) hook.phasesSeen.push(phase);
}

export function exposeDebug(key: string, value: unknown): void {
  hook.data[key] = value;
}
