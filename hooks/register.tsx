import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Job } from '../types'

const PANE = 'facex-renders'
const jobs = atom({ plugin: 'facex-render-watch', key: 'jobs' } as const, [])
const tick = atom({ plugin: 'facex-render-watch', key: 'tick' } as const, 0)

const RENDER = /\b(ffmpeg|blender|remotion|puppeteer|playwright)\b|\brender\w*\.(js|mjs|py|sh)\b|\bnode\s+\S*(render|shot|grab|cover)\S*/i

export const isRender = (command: string) => RENDER.test(command)

export const labelOf = (command: string) => {
  const files = command.match(/[\w.-]+\.(mp4|mov|jpg|png|wav|mp3)\b/gi)
  return files?.at(-1) ?? command.trim().slice(0, 48)
}

export const took = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

const finish = async ($: EngineInterface, match: (j: Job) => boolean, ok: boolean) => {
  const now = await $.clock.now()
  let ended: Job | undefined
  await update($, jobs, (list: Job[]) =>
    list.map(j => {
      if (j.status !== 'running' || !match(j)) return j
      ended = { ...j, status: ok ? 'done' : 'failed', endedAt: now }
      return ended
    }),
  )
  if (ended) {
    const text = ok
      ? `เรนเดอร์เสร็จแล้ว: ${ended.label} (${took(now - ended.startedAt)})`
      : `เรนเดอร์ล้มเหลว: ${ended.label}`
    $.ui.toast(text, { timeoutMs: 15000 })
    void $.ui.notify(text).catch(() => undefined)
  }
  const running = (await read($, jobs)).filter((j: Job) => j.status === 'running')
  $.ui.status(running.length ? `🎬 กำลังเรนเดอร์ ${running.length} งาน` : undefined)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'renders',
      description: 'Open the FaceX render jobs pane',
    })
    $.clock.every(5000, () => {
      void (async () => {
        const list = await read($, jobs)
        if (list.some(j => j.status === 'running')) await update($, tick, n => n + 1)
      })()
    })
    return next(e)
  })

  on('command.run', { command: 'renders' }, async $ => {
    await $.ui.open({ id: PANE, title: 'FaceX renders' })
    return { text: 'FaceX renders pane opened.' }
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (!isRender(e.command)) return next(e)

    const startedAt = await $.clock.now()
    const job: Job = {
      id: e.tool_use_id ?? `job-${startedAt}`,
      label: labelOf(e.command),
      startedAt,
      status: 'running',
    }
    await update($, jobs, list => [...list, job].slice(-30))
    $.ui.status(`🎬 กำลังเรนเดอร์: ${job.label}`)
    void $.ui.open({ id: PANE, title: "FaceX renders" }).catch(() => undefined)

    const ran = await next(e)
    const bgId = ran.deny === undefined && !ran.isError ? ran.result?.backgroundTaskId : undefined
    if (bgId) {
      await update($, jobs, list => list.map(j => (j.id === job.id ? { ...j, bgId } : j)))
      return ran
    }
    await finish($, j => j.id === job.id, ran.deny === undefined && ran.isError !== true)
    return ran
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'task-notification') {
      const id = e.text.match(/<task-id>([^<]+)<\/task-id>/)?.[1]
      const status = e.text.match(/<status>([^<]+)<\/status>/)?.[1]
      if (id) await finish($, j => j.bgId === id, status === 'completed')
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    await read($, tick)
    const list = await read($, jobs)
    const now = await $.clock.now()
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 3)

    return (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>ยังไม่มีงานเรนเดอร์ในเซสชันนี้</Text>}
        {list.slice(-room).reverse().map(j => (
          <Text
            key={j.id}
            color={j.status === 'failed' ? 'red' : j.status === 'done' ? 'green' : 'yellow'}
            dimColor={j.status === 'done'}
          >
            {j.status === 'running' ? '⏳' : j.status === 'done' ? '✅' : '❌'} {j.label}{' '}
            {took((j.endedAt ?? now) - j.startedAt)}
          </Text>
        ))}
      </Box>
    )
  })
}
