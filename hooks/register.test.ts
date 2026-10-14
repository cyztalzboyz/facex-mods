import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { isRender, labelOf, took } from './register'

const surface = (on: On) => {
  const toasts: string[] = []
  mock.clock(on)
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined } as never
  })
  on('ui.status', () => ({ value: undefined }) as never)
  on('ui.notify', () => ({ value: { isSent: false, reason: 'test' } }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('tool.call', { tool: 'Bash' }, () => ({
    result: { stdout: '', stderr: '', interrupted: false },
  }))
  return toasts
}

test('spots render commands and names them by output file', () => {
  expect(isRender('ffmpeg -i a.mp4 -c:v libx264 out/07_facex_filler_v2.mp4')).toBe(true)
  expect(isRender('node render.js scene.html')).toBe(true)
  expect(isRender('blender -b shot.blend -a')).toBe(true)
  expect(isRender('ls -la')).toBe(false)
  expect(labelOf('ffmpeg -i a.mp4 out/07_facex_filler_v2.mp4')).toBe('07_facex_filler_v2.mp4')
  expect(took(83000)).toBe('1m 23s')
})

test('a finished render raises a toast naming the file', async ($, on) => {
  const toasts = surface(on)
  await $.tool.call({ tool: 'Bash', command: 'ffmpeg -i in.mp4 out/reel_v3.mp4' })
  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toContain('reel_v3.mp4')
})

test('other commands raise nothing', async ($, on) => {
  const toasts = surface(on)
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(toasts).toHaveLength(0)
})
