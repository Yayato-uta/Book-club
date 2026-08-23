import type { Mood, StageId } from '../lib/companion';

/**
 * Each book's companion is drawn procedurally. Its body colour comes from the
 * book id, so every book has a distinct character; its expression, posture and
 * aura come from health, so a neglected book looks neglected.
 */

const MOOD_COLOR: Record<Mood, string> = {
  thriving: '#3f9e6b',
  content: '#7aa64a',
  restless: '#d9a13b',
  unwell: '#d4703a',
  fading: '#b8443c',
  fulfilled: '#7c5cff',
};

function hueFrom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

interface Props {
  seed: string;
  stage: StageId;
  mood: Mood;
  health: number;
  accessories: string[];
  size?: number;
}

export default function Companion({ seed, stage, mood, health, accessories, size = 160 }: Props) {
  const hue = hueFrom(seed);
  // A fading companion loses its colour as well as its posture.
  const sat = 20 + (health / 100) * 45;
  const body = `hsl(${hue} ${sat}% ${62 - (100 - health) * 0.08}%)`;
  const bodyDark = `hsl(${hue} ${sat}% ${46 - (100 - health) * 0.06}%)`;
  const aura = MOOD_COLOR[mood];

  const has = (id: string) => accessories.includes(id);
  const droop = (100 - health) / 100; // 0 upright, 1 fully slumped

  if (stage === 'egg') {
    return (
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Companion, still an egg">
        <circle cx="100" cy="104" r="72" fill={aura} opacity="0.10" />
        <ellipse cx="100" cy="112" rx="46" ry="56" fill={body} />
        <ellipse cx="100" cy="112" rx="46" ry="56" fill="none" stroke={bodyDark} strokeWidth="3" />
        <ellipse cx="84" cy="96" rx="9" ry="12" fill="#fff" opacity="0.35" />
        <circle cx="112" cy="128" r="5" fill={bodyDark} opacity="0.4" />
        <circle cx="92" cy="146" r="4" fill={bodyDark} opacity="0.3" />
        <circle cx="118" cy="152" r="3" fill={bodyDark} opacity="0.3" />
      </svg>
    );
  }

  // Body scales up with each stage.
  const scale = { hatchling: 0.72, fledgling: 0.86, companion: 1, sage: 1.08 }[stage] ?? 1;
  const eyeOpen = 9 - droop * 4;

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`Companion, ${stage}, ${mood}`}>
      <circle cx="100" cy="104" r="76" fill={aura} opacity="0.10" />
      {mood === 'fulfilled' && (
        <circle cx="100" cy="104" r="76" fill="none" stroke={aura} strokeWidth="2" opacity="0.5" />
      )}

      <g transform={`translate(100 ${112 + droop * 8}) scale(${scale}) translate(-100 -112)`}>
        {/* wings appear at fledgling and stay */}
        {stage !== 'hatchling' && (
          <>
            <ellipse cx="52" cy="112" rx="16" ry="26" fill={bodyDark} opacity="0.75" transform={`rotate(${-18 + droop * 22} 52 112)`} />
            <ellipse cx="148" cy="112" rx="16" ry="26" fill={bodyDark} opacity="0.75" transform={`rotate(${18 - droop * 22} 148 112)`} />
          </>
        )}

        {/* feet */}
        <ellipse cx="84" cy="156" rx="13" ry="7" fill={bodyDark} />
        <ellipse cx="116" cy="156" rx="13" ry="7" fill={bodyDark} />

        {/* body */}
        <ellipse cx="100" cy="112" rx="50" ry="46" fill={body} />

        {/* sage tuft */}
        {stage === 'sage' && (
          <path d="M100 66 q-6 -18 6 -26 q-2 14 8 20" fill="none" stroke={bodyDark} strokeWidth="4" strokeLinecap="round" />
        )}

        {/* eyes */}
        <ellipse cx="84" cy="104" rx="10" ry={eyeOpen} fill="#fff" />
        <ellipse cx="116" cy="104" rx="10" ry={eyeOpen} fill="#fff" />
        <circle cx={84 + droop * 2} cy={104 + droop * 3} r="4.5" fill="#1c1917" />
        <circle cx={116 + droop * 2} cy={104 + droop * 3} r="4.5" fill="#1c1917" />

        {/* mouth: smile when well, flat then frown as health drops */}
        {health >= 60 ? (
          <path d="M90 126 q10 9 20 0" fill="none" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
        ) : health >= 30 ? (
          <path d="M90 128 h20" fill="none" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
        ) : (
          <path d="M90 130 q10 -8 20 0" fill="none" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
        )}

        {/* accessories */}
        {has('glasses') && (
          <g stroke="#1c1917" strokeWidth="2.5" fill="none" opacity="0.85">
            <circle cx="84" cy="104" r="13" />
            <circle cx="116" cy="104" r="13" />
            <path d="M97 104 h6" />
          </g>
        )}
        {has('scarf') && (
          <>
            <path d="M74 138 q26 12 52 0 v10 q-26 12 -52 0 z" fill="#b8443c" />
            <path d="M120 146 l10 22 l-11 -3 l-4 -16 z" fill="#9c3630" />
          </>
        )}
        {has('laurel') && (
          <g stroke="#c9a227" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M70 78 q12 -16 30 -18" />
            <path d="M130 78 q-12 -16 -30 -18" />
          </g>
        )}
        {has('quill') && (
          <path d="M150 92 q10 -26 -4 -38 q-6 20 -10 30 z" fill="#f5efe2" stroke={bodyDark} strokeWidth="2" />
        )}
      </g>

      {has('bookmark') && <rect x="24" y="30" width="14" height="34" fill="#7c5cff" />}
      {has('bookmark') && <path d="M24 64 l7 -8 l7 8 z" fill="#faf7f2" />}
      {has('lantern') && (
        <g>
          <line x1="170" y1="44" x2="170" y2="58" stroke="#78716c" strokeWidth="2" />
          <rect x="158" y="58" width="24" height="28" rx="4" fill="#f3d78b" stroke="#8a7a4a" strokeWidth="2" />
          <circle cx="170" cy="72" r="6" fill="#fff3c4" />
        </g>
      )}
      {has('star') && <path d="M34 150 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1 z" fill="#f3d78b" stroke="#c9a227" strokeWidth="1.5" />}
    </svg>
  );
}
