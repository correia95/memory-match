# memory-match

The classic concentration / pairs game. Flip two cards a turn, find every match.
Four board sizes (12 / 16 / 24 / 36 cards), a timer, move count, a 1-3 star
rating, spoiler-free "share result", and best time + moves per size in
localStorage.

**Live:** https://memory-match.correia95.workers.dev/

## Stack

- React 18 + TypeScript + Vite, no runtime deps beyond React
- Static-assets Cloudflare Worker
- Cards are emoji, so no image assets. 3D CSS flip.

## Engine

[`src/game.ts`](src/game.ts): `newDeck(level)` shuffles emoji into pairs;
`flip(game, i)` returns the next state plus an optional `settle` list for a
mismatched pair the caller hides after a delay; `stars(game)` rates moves against
the perfect count; `elapsedMs` / `fmtTime`.

Verified in Node: a scripted perfect solve finishes with moves == pairs and 3
stars; a mismatch sets `busy` and returns the two indices; `hide` clears both;
every level has an even card count.

## Develop / deploy

```bash
npm install
npm run dev
npm run deploy
```
