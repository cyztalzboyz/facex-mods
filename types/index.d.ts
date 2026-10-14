export type Job = {
  id: string
  label: string
  startedAt: number
  endedAt?: number
  status: 'running' | 'done' | 'failed'
  bgId?: string
}

declare module 'claude-code' {
  interface PluginState {
    'facex-render-watch': { jobs: Job[]; tick: number }
  }
}
