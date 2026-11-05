import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { PNG } from 'pngjs';
import UPNG from 'upng-js/UPNG.js';
import { fit, hasRTL, rememberFont, visualTokens } from './bidi';

const ink = '#1C1917';
const paper = '#F7F3EC';
const linen = '#FFFDF9';
const tomato = '#E2412B';
const clay = '#B0714B';
const stone = '#857C72';
const hair = '#E5DED3';

const HEART =
  'M50 86 C 20 64, 4 46, 4 28 C 4 14, 15 4, 28 4 C 38 4, 45 9, 50 18 C 55 9, 62 4, 72 4 C 85 4, 96 14, 96 28 C 96 46, 80 64, 50 86 Z';

const serif = 'Instrument Serif';
const sans = 'Inter Tight';
const MAX_W = 560;

type Style = Record<string, string | number | undefined>;
type Node = {
  type: string;
  props: {
    style?: Style;
    src?: string;
    width?: number;
    height?: number;
    children?: Array<Node | string>;
  };
};

const element = (type: string, style: Style = {}, ...children: Array<Node | string | null | false>): Node => ({
  type,
  props: {
    style: { display: 'flex', ...style },
    children: children.flat().filter((child): child is Node | string => child !== null && child !== false),
  },
});

const image = (src: string, width: number, height: number, style: Style = {}): Node => ({
  type: 'img',
  props: { src, width, height, style },
});

const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

function markSvg(ring: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><circle cx="50" cy="42" r="34" fill="none" stroke="${ring}" stroke-width="5"/><path d="${HEART}" transform="translate(36 30) scale(.28)" fill="${tomato}"/><line x1="50" y1="78.5" x2="50" y2="112" stroke="${ring}" stroke-width="5" stroke-linecap="round"/></svg>`;
}

const heartSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90"><path d="${HEART}" fill="${tomato}"/></svg>`;
const selectedPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -46 40 50"><ellipse cx="0" cy="1" rx="8" ry="2.4" fill="${ink}" opacity=".2"/><line x1="0" y1="0" x2="0" y2="-12" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/><circle cx="0" cy="-28" r="16" fill="${ink}"/><path d="${HEART}" transform="translate(-8.3 -35.2) scale(.166)" fill="${tomato}"/></svg>`;

const vendor = join(process.cwd(), 'lib/og/vendor');

function readVendor(path: string): Buffer {
  return readFileSync(join(vendor, path));
}

function fontBuffer(file: string, bytes: Buffer): ArrayBuffer {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  rememberFont(file, copy);
  return copy;
}

let cachedFonts: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts'] | null = null;

function ensureFonts(): NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts'] {
  if (cachedFonts) return cachedFonts;
  const serifRegular = fontBuffer('InstrumentSerif-Regular.ttf', readVendor('fonts/InstrumentSerif-Regular.ttf'));
  const serifItalic = fontBuffer('InstrumentSerif-Italic.ttf', readVendor('fonts/InstrumentSerif-Italic.ttf'));
  const sansMedium = fontBuffer('InterTight-Medium.ttf', readVendor('fonts/InterTight-Medium.ttf'));
  const sansSemi = fontBuffer('InterTight-SemiBold.ttf', readVendor('fonts/InterTight-SemiBold.ttf'));
  const hebrewSerif = fontBuffer('FrankRuhlLibre-Regular.ttf', readVendor('fonts/FrankRuhlLibre-Regular.ttf'));
  const hebrewMedium = fontBuffer('Heebo-Medium.ttf', readVendor('fonts/Heebo-Medium.ttf'));
  const hebrewSemi = fontBuffer('Heebo-SemiBold.ttf', readVendor('fonts/Heebo-SemiBold.ttf'));
  cachedFonts = [
    { name: 'Instrument Serif', data: serifRegular, weight: 400, style: 'normal' },
    { name: 'Instrument Serif', data: serifItalic, weight: 400, style: 'italic' },
    { name: 'Inter Tight', data: sansMedium, weight: 500, style: 'normal' },
    { name: 'Inter Tight', data: sansSemi, weight: 600, style: 'normal' },
    { name: 'Frank Ruhl Libre', data: hebrewSerif, weight: 400, style: 'normal' },
    { name: 'Heebo', data: hebrewMedium, weight: 500, style: 'normal' },
    { name: 'Heebo', data: hebrewSemi, weight: 600, style: 'normal' },
  ];
  return cachedFonts;
}

let backgroundUri: string | null = null;

function paperBackground(): string {
  backgroundUri ??= `data:image/png;base64,${readVendor('og-bg-paper-map.png').toString('base64')}`;
  return backgroundUri;
}

const lockup = (size: number, color: string, markColor: string) =>
  element(
    'div',
    { alignItems: 'flex-end', gap: size * 0.16 },
    element(
      'div',
      { fontFamily: serif, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.015, color },
      'Love\u00a0',
      element('span', { fontStyle: 'italic' }, 'it'),
    ),
    image(svgUri(markSvg(markColor)), (size * 0.56 * 100) / 120, size * 0.56, { marginBottom: size * 0.12 }),
  );

function sampleTag(onPhoto: boolean): Node {
  return element(
    'div',
    {
      position: 'absolute',
      right: 24,
      bottom: 20,
      fontFamily: sans,
      fontSize: 16,
      fontWeight: 600,
      letterSpacing: 2,
      color: onPhoto ? 'rgba(247,243,236,.7)' : stone,
      textTransform: 'uppercase',
    },
    'Sample data',
  );
}

function root(children: Node[], background: Node): Node {
  return element(
    'div',
    { width: 1200, height: 630, position: 'relative', alignItems: 'center', justifyContent: 'center', background: paper },
    background,
    ...children,
  );
}

function paperBg(): Node {
  return image(paperBackground(), 1200, 630, { position: 'absolute', left: 0, top: 0 });
}

function column(top: number, bottom: number, extra: Style = {}): Style {
  return {
    position: 'absolute',
    left: 285,
    top,
    width: 630,
    height: 630 - top - bottom,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...extra,
  };
}

function hasHebrew(value: string): boolean {
  return /[\u0590-\u05FF]/.test(value);
}

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0] ?? '')
    .join('');
  return letters.toUpperCase();
}

function avatarNode(src: string | null, name: string, background: string): Node {
  const inner = src
    ? image(src, 168, 168, { borderRadius: 84, objectFit: 'cover' })
    : element(
        'div',
        {
          width: 168,
          height: 168,
          borderRadius: 84,
          background,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: hasHebrew(name) ? 'Frank Ruhl Libre' : serif,
          fontSize: 76,
          color: paper,
          paddingTop: hasHebrew(name) ? 0 : 6,
        },
        element('span', {}, initials(name)),
      );
  return element(
    'div',
    {
      width: 184,
      height: 184,
      borderRadius: 92,
      background: linen,
      border: `1px solid ${hair}`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inner,
  );
}

function oneLine(raw: string, style: Style, fontFile: string, sizes: number[]): Node {
  const fitted = fit(raw, fontFile, sizes, MAX_W);
  if (!hasRTL(fitted.text)) {
    return element('div', { whiteSpace: 'nowrap', ...style, fontSize: fitted.size }, fitted.text);
  }
  return element(
    'div',
    { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', whiteSpace: 'pre', ...style, fontSize: fitted.size },
    ...visualTokens(fitted.text).map((token) =>
      token.space ? element('div', { width: '0.26em' }) : element('span', {}, token.t),
    ),
  );
}

const serifFile = (value: string) => (hasRTL(value) ? 'FrankRuhlLibre-Regular.ttf' : 'InstrumentSerif-Regular.ttf');
const italicFile = (value: string) => (hasRTL(value) ? 'FrankRuhlLibre-Regular.ttf' : 'InstrumentSerif-Italic.ttf');
const sansFile = (value: string) => (hasRTL(value) ? 'Heebo-Medium.ttf' : 'InterTight-Medium.ttf');

export function profileCard(input: {
  name: string;
  first: string;
  count: number;
  avatarSrc?: string | null;
  avatarBg?: string;
  sample?: boolean;
}): Node {
  ensureFonts();
  const hebrew = hasHebrew(input.name);
  const card = element(
    'div',
    column(0, 0),
    avatarNode(input.avatarSrc ?? null, input.name, input.avatarBg || clay),
    oneLine(
      input.name,
      { marginTop: 20, fontFamily: hebrew ? 'Frank Ruhl Libre' : serif, fontSize: 84, lineHeight: 1.1, color: ink },
      serifFile(input.name),
      [84, 72, 60],
    ),
    element(
      'div',
      {
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 8,
        fontFamily: hebrew ? 'Frank Ruhl Libre' : serif,
        fontStyle: hebrew ? 'normal' : 'italic',
        fontSize: 46,
        lineHeight: '52px',
        color: stone,
      },
      oneLine(
        hebrew ? `המקומות האהובים על ${input.first}` : `${input.first}'s favorite places`,
        { fontSize: 46 },
        italicFile(input.name),
        [46],
      ),
    ),
    element(
      'div',
      { marginTop: 32, alignItems: 'center', gap: 24 },
      element(
        'div',
        { alignItems: 'center', gap: 14, fontFamily: sans, fontWeight: 600, fontSize: 44, color: ink },
        image(svgUri(heartSvg), 40, 36),
        `${input.count} ${input.count === 1 ? 'place' : 'places'}`,
      ),
      element('div', { width: 1, height: 44, background: hair }),
      lockup(52, ink, ink),
    ),
  );
  return root(input.sample ? [card, sampleTag(false)] : [card], paperBg());
}

export function placeCard(input: {
  name: string;
  category: string;
  area: string;
  photoSrc?: string | null;
  sample?: boolean;
}): Node {
  ensureFonts();
  const hebrew = hasHebrew(input.name);
  const meta = [input.category, input.area].filter(Boolean).join(' · ');
  const nameLine = oneLine(
    input.name,
    {
      fontFamily: hebrew ? 'Frank Ruhl Libre' : serif,
      fontSize: 112,
      lineHeight: 1.05,
      color: input.photoSrc ? paper : ink,
    },
    serifFile(input.name),
    [112, 96, 80, 64],
  );
  const metaLine = meta
    ? oneLine(
        meta,
        {
          marginTop: input.photoSrc ? 14 : 12,
          fontFamily: hasHebrew(meta) ? 'Heebo' : sans,
          fontWeight: 500,
          fontSize: 44,
          color: input.photoSrc ? 'rgba(247,243,236,0.88)' : stone,
        },
        sansFile(meta),
        [44],
      )
    : null;

  if (input.photoSrc) {
    return root(
      [
        image(input.photoSrc, 1200, 630, { position: 'absolute', left: 0, top: 0, objectFit: 'cover' }),
        element('div', {
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1200,
          height: 630,
          backgroundImage:
            'linear-gradient(180deg, rgba(28,25,23,0.45) 0%, rgba(28,25,23,0.12) 28%, rgba(28,25,23,0.45) 52%, rgba(28,25,23,0.88) 100%)',
        }),
        element(
          'div',
          column(44, 52, { justifyContent: 'space-between' }),
          lockup(56, paper, paper),
          element('div', { flexDirection: 'column', alignItems: 'center' }, nameLine, metaLine),
        ),
        ...(input.sample ? [sampleTag(true)] : []),
      ],
      element('div', { position: 'absolute', left: 0, top: 0, width: 1200, height: 630, background: ink }),
    );
  }

  return root(
    [
      element(
        'div',
        column(48, 48, { justifyContent: 'space-between' }),
        image(svgUri(selectedPinSvg), 112, 140),
        element('div', { flexDirection: 'column', alignItems: 'center' }, nameLine, metaLine),
        lockup(52, ink, ink),
      ),
      ...(input.sample ? [sampleTag(false)] : []),
    ],
    paperBg(),
  );
}

const CACHE = 'public, max-age=31536000, immutable';

export async function renderCard(node: Node): Promise<Uint8Array> {
  const response = new ImageResponse(node as unknown as React.ReactElement, {
    width: 1200,
    height: 630,
    fonts: ensureFonts(),
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': CACHE,
    },
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength <= 280 * 1024) return bytes;
  const decoded = PNG.sync.read(Buffer.from(bytes));
  const pixels = decoded.data.buffer.slice(
    decoded.data.byteOffset,
    decoded.data.byteOffset + decoded.data.byteLength,
  ) as ArrayBuffer;
  return new Uint8Array(UPNG.encode([pixels], decoded.width, decoded.height, 256));
}

export function pngResponse(bytes: Uint8Array): Response {
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': CACHE,
    },
  });
}

export function defaultOgResponse(): Response {
  const bytes = readFileSync(join(process.cwd(), 'public/og-default.png'));
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
