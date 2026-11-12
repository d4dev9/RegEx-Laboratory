import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const sharpModule = require("sharp");
const sharp = typeof sharpModule === "function" ? sharpModule : sharpModule.default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
mkdirSync(publicDir, { recursive: true });

const mark = JSON.parse(
  readFileSync(path.join(rootDir, "src", "brand", "mark.json"), "utf8"),
);
const { colors, glyph } = mark;

function tierFor(size) {
  return mark.tiers.find((tier) => size <= tier.maxSize) ?? mark.tiers.at(-1);
}

function starPath(cx, cy, r, arms, innerRatio) {
  const points = [];
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

function markGroup(box, { tx = 0, ty = 0, fit = 1 } = {}) {
  const tier = tierFor(box);
  const stroke = tier.stroke;

  const scale = (box / glyph.width) * fit;
  const boxW = glyph.width * scale;
  const boxH = glyph.height * scale;

  const open = glyph.open;
  const close = glyph.close;
  const dot = glyph.dot;
  const star = glyph.star;

  return `<g transform="translate(${(tx + (box - boxW) / 2).toFixed(2)} ${(ty + (box - boxH) / 2).toFixed(2)}) scale(${scale.toFixed(5)})">
    <g fill="none" stroke="${colors.paren}" stroke-width="${stroke}" stroke-linecap="round">
      <path d="M ${open.topX} ${open.topY} Q ${open.bulgeX} ${glyph.height / 2} ${open.bottomX} ${open.bottomY}"/>
      <path d="M ${close.topX} ${close.topY} Q ${close.bulgeX} ${glyph.height / 2} ${close.bottomX} ${close.bottomY}"/>
    </g>
    <circle cx="${dot.cx}" cy="${dot.cy}" r="${(dot.r * tier.dotScale).toFixed(2)}" fill="${colors.dot}"/>
    <path d="${starPath(
      star.cx,
      star.cy,
      star.r * tier.starScale,
      tier.starArms,
      star.innerRatio,
    )}" fill="none" stroke="${colors.star}" stroke-width="${stroke}" stroke-linecap="round"/>
  </g>`;
}

function iconSvg(size, { rounded = true, bg = colors.tile, safe = 0 } = {}) {
  const radius = rounded ? size * 0.22 : 0;
  const tier = tierFor(size);
  const pad = size * tier.padding;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${bg}"/>
  ${markGroup(size - pad * 2, { tx: pad, ty: pad, fit: 1 - safe })}
</svg>`;
}
function ogSvg() {
  const w = 1200;
  const h = 630;
  const og = mark.og;
  const font = "Segoe UI, Helvetica, Arial, sans-serif";

  const markBox = 96;
  const brand = `<g transform="translate(96 150)">
      <rect width="${markBox}" height="${markBox}" rx="21" fill="${colors.tile}"/>
      ${markGroup(markBox - 14, { tx: 7, ty: 7 })}
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${og.background}"/>
      <stop offset="100%" stop-color="#131c31"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${og.accentBarFrom}"/>
      <stop offset="100%" stop-color="${og.accentBarTo}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${w}" height="6" fill="url(#accent)"/>

  ${brand}
  <text x="216" y="212" font-family="${font}" font-size="40" font-weight="600" fill="${og.title}">Regex Lab</text>

  <text x="96" y="376" font-family="${font}" font-size="62" font-weight="700" fill="${og.title}">Escribe, entiende y depura</text>
  <text x="96" y="454" font-family="${font}" font-size="62" font-weight="700" fill="${og.subtitle}">RegEx sin dolor</text>

  <text x="96" y="536" font-family="${font}" font-size="27" fill="${og.subtitle}">Builder visual · Tester en tiempo real · Explicación token-a-token · Biblioteca personal</text>
</svg>`;
}

async function writePng(name, svg, size) {
  const buffer = await sharp(Buffer.from(svg))
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(path.join(publicDir, name), buffer);
  console.log(`  ${name.padEnd(26)} ${size}x${size}  ${(buffer.length / 1024).toFixed(1)} KB`);
}

console.log("Generando assets en public/");

await writePng("favicon.png", iconSvg(512), 512);

for (const size of [16, 32, 48, 192, 512]) {
  await writePng(`favicon-${size}x${size}.png`, iconSvg(size), size);
}

await writePng("apple-touch-icon.png", iconSvg(180, { rounded: false }), 180);

await writePng(
  "icon-maskable-512.png",
  iconSvg(512, { rounded: false, safe: 0.28 }),
  512,
);

{
  const buffer = await sharp(Buffer.from(ogSvg()))
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(path.join(publicDir, "og.png"), buffer);
  console.log(`  ${"og.png".padEnd(26)} 1200x630  ${(buffer.length / 1024).toFixed(1)} KB`);
}

{
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const size of sizes) {
    pngs.push(
      await sharp(Buffer.from(iconSvg(size)))
        .resize(size, size)
        .png({ compressionLevel: 9 })
        .toBuffer(),
    );
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);

  const entries = [];
  let offset = header.length + sizes.length * 16;
  sizes.forEach((size, i) => {
    const entry = Buffer.alloc(16);

    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);

    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(pngs[i].length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    entries.push(entry);
  });

  writeFileSync(
    path.join(publicDir, "favicon.ico"),
    Buffer.concat([header, ...entries, ...pngs]),
  );
  console.log(
    `  ${"favicon.ico".padEnd(26)} ${sizes.join("/")}      ICO container, ${sizes.length} resolutions`,
  );
}

const manifest = {
  name: "Regex Lab — Escribe, entiende y depura RegEx sin dolor",
  short_name: "Regex Lab",
  description:
    "Editor visual de RegEx con tester en tiempo real, explicación token-a-token, biblioteca personal y export multi-lenguaje.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: colors.tile,
  theme_color: colors.paren,
  lang: "es",
  dir: "ltr",
  icons: [
    { src: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    { src: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    {
      src: "/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
  shortcuts: [
    { name: "Laboratorio", url: "/lab" },
    { name: "Cheatsheet", url: "/cheatsheet" },
  ],
};
writeFileSync(
  path.join(publicDir, "site.webmanifest"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`  ${"site.webmanifest".padEnd(26)} manifest`);

console.log("\nListo.");