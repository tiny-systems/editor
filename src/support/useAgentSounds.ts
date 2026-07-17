// Agent sound cues for the activity feed. The platform plays short audio
// samples; the library ships a no-op by default (hosts can provide their own
// later). Keeping the same shape means the activity store needs no changes.

export type AgentSoundKind =
  | 'tool-start'
  | 'tool-success'
  | 'tool-fail'
  | 'flow-created'
  | 'flow-deleted'
  | 'module-installed'
  | 'module-uninstalled'

export function useAgentSounds() {
  return {
    play(_kind: AgentSoundKind) {
      // no-op
    },
    enabled: false,
  }
}
