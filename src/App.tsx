import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Game, LEVELS, Level, elapsedMs, flip, fmtTime, hide, init, newDeck, stars } from './game';

function readLevel(): Level {
  try {
    const id = new URLSearchParams(window.location.search).get('l') || localStorage.getItem('memory-match:level');
    return LEVELS.find((l) => l.id === id) || LEVELS[1];
  } catch {
    return LEVELS[1];
  }
}

interface Best {
  ms: number;
  moves: number;
}
function loadBest(id: string): Best | null {
  try {
    const raw = localStorage.getItem(`memory-match:best:${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [level, setLevel] = useState<Level>(readLevel);
  const [game, setGame] = useState<Game>(() => init(newDeck(readLevel())));
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [bestBeaten, setBestBeaten] = useState(false);
  const settleTimer = useRef<number>();

  const restart = useCallback((lvl: Level) => {
    setGame(init(newDeck(lvl)));
    setBestBeaten(false);
    setCopied(false);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('memory-match:level', level.id);
      const u = new URL(window.location.href);
      u.searchParams.set('l', level.id);
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* ignore */
    }
  }, [level]);

  // running clock
  useEffect(() => {
    if (game.startedAt == null || game.finishedAt != null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [game.startedAt, game.finishedAt]);

  // save best on finish
  useEffect(() => {
    if (game.finishedAt == null) return;
    const ms = elapsedMs(game);
    const prev = loadBest(level.id);
    if (!prev || ms < prev.ms || (ms === prev.ms && game.moves < prev.moves)) {
      try {
        localStorage.setItem(`memory-match:best:${level.id}`, JSON.stringify({ ms, moves: game.moves }));
      } catch {
        /* ignore */
      }
      if (prev) setBestBeaten(true);
    }
  }, [game.finishedAt, game.moves, level.id]);

  const onCard = (i: number) => {
    const { game: g2, settle } = flip(game, i);
    setGame(g2);
    if (settle) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => setGame((g) => hide(g, settle)), 750);
    }
  };

  const changeLevel = (lvl: Level) => {
    setLevel(lvl);
    restart(lvl);
  };

  const ms = elapsedMs(game, now);
  const best = useMemo(() => loadBest(level.id), [level.id, game.finishedAt]);
  const won = game.finishedAt != null;
  const st = won ? stars(game) : 0;

  const share = async () => {
    const line = `Memory Match · ${level.name}\nSolved in ${fmtTime(ms)} · ${game.moves} moves · ${'★'.repeat(st)}${'☆'.repeat(3 - st)}\n${window.location.origin}`;
    try {
      if ('share' in navigator && navigator.share) {
        await navigator.share({ text: line });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Memory Match</h1>
        <p className="tag">
          Flip two cards a turn and find every matching pair. Fewer moves and less time is a better
          score — three stars for a near-perfect run.
        </p>
      </header>

      <div className="bar">
        <div className="seg">
          {LEVELS.map((l) => (
            <button key={l.id} className={l.id === level.id ? 'on' : ''} onClick={() => changeLevel(l)}>{l.name}</button>
          ))}
        </div>
        <button className="new" onClick={() => restart(level)}>New game</button>
      </div>

      <div className="stats">
        <span>⏱ {fmtTime(ms)}</span>
        <span>🔁 {game.moves} moves</span>
        <span>{game.matches}/{game.cards.length / 2} pairs</span>
        {best && <span className="best">best {fmtTime(best.ms)} · {best.moves}</span>}
      </div>

      <div
        className={`board ${won ? 'won' : ''}`}
        style={{ ['--cols' as string]: level.cols }}
      >
        {game.cards.map((c, i) => (
          <button
            key={c.id}
            className={`card ${c.flipped || c.matched ? 'up' : ''} ${c.matched ? 'matched' : ''}`}
            onClick={() => onCard(i)}
            aria-label={c.flipped || c.matched ? c.face : 'face-down card'}
          >
            <span className="inner">
              <span className="front">?</span>
              <span className="back">{c.face}</span>
            </span>
          </button>
        ))}
      </div>

      {won && (
        <div className="done">
          <p className="stars">{'★'.repeat(st)}{'☆'.repeat(3 - st)}</p>
          <p className="wow">
            Solved {level.name} in {fmtTime(ms)} · {game.moves} moves
            {bestBeaten && <span className="pb"> · new best!</span>}
          </p>
          <div className="doneacts">
            <button className="share" onClick={share}>{copied ? 'Copied' : 'share' in navigator ? 'Share result' : 'Copy result'}</button>
            <button className="again" onClick={() => restart(level)}>Play again</button>
          </div>
        </div>
      )}

      <section className="explainer">
        <h2>How to play</h2>
        <p>
          Tap a card to flip it, then tap another. If they match, they stay face-up; if not, they
          flip back after a moment — remember where they were. Clear the whole board to win. The
          timer starts on your first flip.
        </p>
        <h3>Scoring</h3>
        <p>
          A "move" is a pair of flips. The fewest possible moves is one per pair — if you had a
          perfect memory. Three stars means you got close to that, two stars is a solid run, one
          star means you'll want another go. Your best time and move count for each size are kept in
          this browser.
        </p>
        <h3>Does it get harder?</h3>
        <p>
          The board sizes go from 12 cards (Easy) to 36 (Expert). Expert is genuinely hard — six
          rows of six, eighteen pairs to hold in your head. The cards are shuffled fresh every game.
        </p>
        <h3>Is anything sent to a server?</h3>
        <p>No. The game runs entirely in your browser and only your best scores are saved, locally.</p>
        <footer>Memory Match · free · no sign-up · a quick brain workout</footer>
      </section>
    </div>
  );
}
