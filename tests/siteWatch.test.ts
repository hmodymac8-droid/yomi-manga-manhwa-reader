import assert from 'node:assert/strict'
import test from 'node:test'
import { dayKey, diagnose, newlyBroken, pushDay, runDue } from '../src/main/siteWatchLogic.ts'

const step = (name: string, status: 'ok' | 'warn' | 'fail', detail: string) => ({
  name,
  status,
  detail,
  ms: 10
})
const ok = [step('Title list', 'ok', '100 titles saved')]

test('a site that works says so', () => {
  assert.equal(diagnose('ok', ok).cause, 'ok')
})

test('an empty title list is fixed by reading it again', () => {
  const d = diagnose('fail', [
    step('Title list', 'fail', 'No titles saved for this site. Try "Re-scan titles".')
  ])
  assert.equal(d.cause, 'titles')
  assert.equal(d.fix, 'rescan')
})

test('failures are put in plain words by what went wrong', () => {
  const at = (name: string, detail: string) =>
    diagnose('fail', [...ok, step(name, 'fail', detail)]).cause
  assert.equal(at('Chapter list', 'Cloudflare challenge: Just a moment...'), 'check')
  assert.equal(at('Chapter list', 'took longer than 60 s'), 'down')
  assert.equal(at('Chapter list', 'net::ERR_NAME_NOT_RESOLVED'), 'down')
  assert.equal(at('Chapter list', 'domain changed to https://new.example'), 'moved')
  assert.equal(at('Chapter list', 'No chapters found on the 3 series tried'), 'changed')
  assert.equal(at('Chapter pages', 'The newest chapter gave no pages'), 'changed')
  assert.equal(at('Image', 'First page did not download (HTTP 403, text/html)'), 'pictures')
  assert.equal(diagnose('fail', [...ok, step('Image', 'fail', 'x')]).fix, undefined)
})

test('a half-working site names its catch', () => {
  const d = diagnose('warn', [
    ...ok,
    step('Chapter list', 'warn', '12 chapters, but the list looks cut short')
  ])
  assert.equal(d.cause, 'partial')
  assert.match(d.text, /cut short/)
})

test('one result per day, 14 days kept, oldest first', () => {
  let days: ReturnType<typeof pushDay> = []
  for (let i = 1; i <= 20; i++) days = pushDay(days, `2026-11-${String(i).padStart(2, '0')}`, 'ok')
  days = pushDay(days, '2026-11-20', 'fail') // a second run the same day replaces the first
  assert.equal(days.length, 14)
  assert.equal(days[0].d, '2026-11-07')
  assert.deepEqual(days.at(-1), { d: '2026-11-20', o: 'fail' })
  assert.equal(newlyBroken(days), true)
  assert.equal(newlyBroken(pushDay(days, '2026-11-21', 'fail')), false)
  assert.match(dayKey(Date.UTC(2026, 10, 25, 12)), /^2026-11-2[56]$/)
})

test('a run is due once a day, or right away when the last one stopped halfway', () => {
  const day = 24 * 60 * 60 * 1000
  assert.equal(runDue({}, 1000), true)
  assert.equal(runDue({ startedAt: 10, finishedAt: 20 }, 20 + day - 1), false)
  assert.equal(runDue({ startedAt: 10, finishedAt: 20 }, 20 + day), true)
  assert.equal(runDue({ startedAt: 30, finishedAt: 20 }, 40), true)
})
