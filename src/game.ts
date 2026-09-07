// Memory / concentration game logic. Cards are emoji; pure functions + a
// small reducer-style state helper.

export interface Level {
  id: string;
  name: string;
  cols: number;
  rows: number; // cols*rows must be even
}

export const LEVELS: Level[] = [
  { id: 'easy', name: 'Easy', cols: 4, rows: 3 },
  { id: 'medium', name: 'Medium', cols: 4, rows: 4 },
  { id: 'hard', name: 'Hard', cols: 6, rows: 4 },
  { id: 'expert', name: 'Expert', cols: 6, rows: 6 },
];

// a friendly, high-contrast emoji set — 18 distinct, enough for the 6x6 board
const EMOJI = [
  '🍎', '🚀', '🐳', '🌵', '⚽', '🎸', '🍄', '🔑', '🦋', '🍩',
  '⛄', '🌈', '🎲', '🧭', '🪁', '🦕', '🍕', '🎯',
];

export interface Card {
  id: number;
  face: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newDeck(level: Level, rnd: () => number = Math.random): Card[] {
  const pairs = (level.cols * level.rows) / 2;
  const faces = shuffle(EMOJI, rnd).slice(0, pairs);
  const doubled = shuffle([...faces, ...faces], rnd);
  return doubled.map((face, id) => ({ id, face, flipped: false, matched: false }));
}

export interface Game {
  cards: Card[];
  moves: number;
  matches: number;
  startedAt: number | null;
  finishedAt: number | null;
  first: number | null; // index of first flipped card awaiting a second
  busy: boolean; // true while a mismatched pair is showing
}

export function init(deck: Card[]): Game {
  return { cards: deck, moves: 0, matches: 0, startedAt: null, finishedAt: null, first: null, busy: false };
}

// try to flip the card at index i. Returns the new game plus an optional
// "settle" instruction if a mismatched pair now needs to be hidden.
export function flip(g: Game, i: number): { game: Game; settle: number[] | null } {
  if (g.busy || g.finishedAt) return { game: g, settle: null };
  const card = g.cards[i];
  if (card.flipped || card.matched) return { game: g, settle: null };

  const cards = g.cards.map((c, k) => (k === i ? { ...c, flipped: true } : c));
  const startedAt = g.startedAt ?? Date.now();

  if (g.first == null) {
    return { game: { ...g, cards, startedAt, first: i }, settle: null };
  }

  // second card of a pair
  const a = g.first;
  const moves = g.moves + 1;
  if (cards[a].face === cards[i].face) {
    const matched = cards.map((c, k) => (k === a || k === i ? { ...c, matched: true } : c));
    const matches = g.matches + 1;
    const done = matches === cards.length / 2;
    return {
      game: {
        ...g,
        cards: matched,
        moves,
        matches,
        first: null,
        startedAt,
        finishedAt: done ? Date.now() : null,
      },
      settle: null,
    };
  }
  // mismatch — show both, then caller hides them
  return { game: { ...g, cards, moves, first: null, startedAt, busy: true }, settle: [a, i] };
}

export function hide(g: Game, idx: number[]): Game {
  return {
    ...g,
    busy: false,
    cards: g.cards.map((c, k) => (idx.includes(k) ? { ...c, flipped: false } : c)),
  };
}

export function elapsedMs(g: Game, now = Date.now()): number {
  if (g.startedAt == null) return 0;
  return (g.finishedAt ?? now) - g.startedAt;
}

export function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, '0')}` : `${r}s`;
}

// star rating: 3 if moves <= perfect*1.5, 2 if <= perfect*2.2, else 1
export function stars(g: Game): number {
  const perfect = g.cards.length / 2;
  if (g.moves <= Math.ceil(perfect * 1.5)) return 3;
  if (g.moves <= Math.ceil(perfect * 2.2)) return 2;
  return 1;
}
