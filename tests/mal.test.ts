import assert from 'node:assert/strict'
import test from 'node:test'
import { malNorm, parseMangaPage, parseTopPage, pickMatch } from '../src/main/malLogic.ts'

// Trimmed from MyAnimeList's real answers (2026-11-23)
const PREFIX = {
  categories: [
    {
      type: 'manga',
      items: [
        {
          id: 119184,
          type: 'manga',
          name: 'Solo Leveling',
          url: 'https://myanimelist.net/manga/119184/Solo_Leveling',
          payload: { media_type: 'Novel', score: '8.21' }
        },
        {
          id: 121496,
          type: 'manga',
          name: 'Solo Leveling',
          url: 'https://myanimelist.net/manga/121496/Solo_Leveling',
          payload: { media_type: 'Manhwa', score: '8.54' }
        },
        {
          id: 172429,
          type: 'manga',
          name: 'Solo Leveling: Ragnarok',
          url: 'https://myanimelist.net/manga/172429/Solo_Leveling__Ragnarok',
          payload: { media_type: 'Manhwa', score: 'N/A' }
        }
      ]
    }
  ]
}

test('the comic of the same name is picked, not the novel', () => {
  assert.deepEqual(pickMatch(PREFIX, ['Solo Leveling']), {
    id: 121496,
    url: 'https://myanimelist.net/manga/121496/Solo_Leveling',
    score: '8.54'
  })
})

test('a near name is not taken for the series', () => {
  assert.equal(pickMatch(PREFIX, ['Solo Leveling Ragnarok 2']), null)
  assert.equal(pickMatch({}, ['Solo Leveling']), null)
  assert.equal(pickMatch(null, ['Solo Leveling']), null)
})

test('punctuation and case do not matter, and a missing score stays empty', () => {
  assert.equal(pickMatch(PREFIX, ['solo leveling: RAGNAROK'])?.score, '')
  assert.equal(malNorm('  Solo-Leveling! '), 'sololeveling')
  assert.equal(malNorm('الفصل ١'), malNorm('الفصل١'))
})

test('rank, popularity, members and score come from a series page', () => {
  const html = `<span class="numbers ranked" title="based on the top anime page.">Ranked <strong>#150</strong></span>
<span class="numbers popularity">Popularity <strong>#5</strong></span>
<span class="numbers members">Members <strong>632,113</strong></span>
<div class="score-label score-8">8.54</div><span itemprop="ratingCount" style="display:none;">377705</span>`
  assert.deepEqual(parseMangaPage(html), {
    score: '8.54',
    scoredBy: 377705,
    rank: 150,
    popularity: 5,
    members: 632113
  })
  assert.deepEqual(parseMangaPage('<html></html>'), {
    score: '',
    scoredBy: undefined,
    rank: undefined,
    popularity: undefined,
    members: undefined
  })
})

test('a top list page gives its titles in order', () => {
  const row = (
    rank: number,
    id: number,
    title: string,
    score: string
  ): string => `<tr class="ranking-list">
<td class="rank ac" valign="top"><span class="lightLink top-anime-rank-text rank1">${rank}</span></td>
<td class="title"><h3 class="manga_h3"><a class="hoverinfo_trigger fs14 fw-b" href="https://myanimelist.net/manga/${id}/X" id="#area${id}">${title}</a></h3></td>
<td class="score ac fs14"><div><span class="text on score-label score-9">${score}</span></div></td>
<td class="your-score"><span class="text  score-label score-na">N/A</span></td></tr>`
  const html =
    '<table>' +
    row(1, 147272, 'The Greatest Estate Developer', '9.11') +
    row(2, 2, 'Tom &amp; Jerry&#039;s', '8.90') +
    '</table>'
  assert.deepEqual(parseTopPage(html), [
    {
      id: 147272,
      url: 'https://myanimelist.net/manga/147272/X',
      title: 'The Greatest Estate Developer',
      score: '9.11',
      rank: 1
    },
    {
      id: 2,
      url: 'https://myanimelist.net/manga/2/X',
      title: "Tom & Jerry's",
      score: '8.90',
      rank: 2
    }
  ])
})
