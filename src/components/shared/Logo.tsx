import mark from "@/brand/mark.json";

const { colors, glyph, tiers } = mark;

type Tier = (typeof tiers)[number];

function tierFor(size: number): Tier {
  return tiers.find((tier) => size <= tier.maxSize) ?? tiers[tiers.length - 1];
}

function starPath(
  cx: number,
  cy: number,
  r: number,
  arms: number,
  innerRatio: number
): string {
  const points: string[] = [];
  for (let i = 0; i < arms; i += 1) {

    const angle = ((-90 + (360 / arms) * i) * Math.PI) / 180;
    const dx = Math.cos(angle) * r;
    const dy = Math.sin(angle) * r;
    const ix = Math.cos(angle) * r * innerRatio;
    const iy = Math.sin(angle) * r * innerRatio;
    points.push(
      `M ${(cx + ix).toFixed(2)} ${(cy + iy).toFixed(2)} L ${(cx + dx).toFixed(2)} ${(cy + dy).toFixed(2)}`,
    );
  }
  return points.join(" ");
}

export function LogoMark({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const tier = tierFor(size);
  const pad = size * tier.padding;
  const box = size - pad * 2;
  const scale = box / glyph.width;
  const star = glyph.star;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className.trim()}
      aria-hidden="true"
      focusable="false"
    >

      <rect
        width={size}
        height={size}
        rx={size * 0.22}
        fill={colors.tile}
      />
      <g
        transform={`translate(${pad} ${pad + (box - glyph.height * scale) / 2}) scale(${scale})`}
      >
        <g
          fill="none"
          stroke={colors.paren}
          strokeWidth={tier.stroke}
          strokeLinecap="round"
        >
          <path
            d={`M ${glyph.open.topX} ${glyph.open.topY} Q ${glyph.open.bulgeX} ${glyph.height / 2} ${glyph.open.bottomX} ${glyph.open.bottomY}`}
          />
          <path
            d={`M ${glyph.close.topX} ${glyph.close.topY} Q ${glyph.close.bulgeX} ${glyph.height / 2} ${glyph.close.bottomX} ${glyph.close.bottomY}`}
          />
        </g>
        <circle
          cx={glyph.dot.cx}
          cy={glyph.dot.cy}
          r={glyph.dot.r * tier.dotScale}
          fill={colors.dot}
        />
        <path
          d={starPath(
            star.cx,
            star.cy,
            star.r * tier.starScale,
            tier.starArms,
            star.innerRatio
          )}
          fill="none"
          stroke={colors.star}
          strokeWidth={tier.stroke}
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function LogoLink({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2 ${className}`.trim()}>
      <LogoMark size={size} className="shrink-0" />
      <span>Regex Lab</span>
    </span>
  );
}