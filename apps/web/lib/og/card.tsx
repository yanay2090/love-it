import { ImageResponse } from 'next/og';
import { OG_HEADERS, OG_SIZE, ogFonts } from './fonts';

const ink = '#1C1917';
const paper = '#F7F3EC';
const stone = '#857C72';
const clay = '#B0714B';
const tomato = '#E2412B';
const land = '#EFE9DF';
const water = '#CBD8D6';
const road = '#FBF8F3';

export interface SharePin {
  /** 0–1 across the map panel. */
  x: number;
  /** 0–1 down the map panel. */
  y: number;
}

/**
 * One layout for profile and place cards. Replace this function when the
 * designer delivers the final banner. Keep the 1200×630 size.
 */
export function ShareCard({
  kicker,
  title,
  subtitle,
  initials,
  pins,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  initials?: string;
  pins: SharePin[];
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: paper,
        color: ink,
        fontFamily: 'Inter Tight',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 700,
          padding: '56px 28px 56px 64px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Instrument Serif', fontSize: 36 }}>
          Love it
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: tomato,
              marginLeft: 12,
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {initials ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 84,
                height: 84,
                borderRadius: 42,
                background: ink,
                color: paper,
                fontFamily: 'Rubik',
                fontSize: 32,
                marginBottom: 24,
              }}
            >
              {initials}
            </div>
          ) : null}
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 1.5, color: clay, fontFamily: 'Inter Tight' }}>
            {kicker}
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Rubik',
              fontSize: title.length > 22 ? 54 : 68,
              lineHeight: 1.05,
              marginTop: 14,
              letterSpacing: -1,
            }}
          >
            {fit(title, 42)}
          </div>
          <div style={{ display: 'flex', marginTop: 18, fontSize: 28, color: stone, fontFamily: 'Inter Tight' }}>
            {fit(subtitle, 72)}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: stone }}>loveitapp.com</div>
      </div>
      <div style={{ display: 'flex', flex: 1, padding: 36 }}>
        <MapPanel pins={pins} />
      </div>
    </div>
  );
}

function MapPanel({ pins }: { pins: SharePin[] }) {
  const marks = pins.length > 0 ? pins.slice(0, 8) : [
    { x: 0.32, y: 0.28 },
    { x: 0.62, y: 0.46 },
    { x: 0.4, y: 0.7 },
  ];
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        flex: 1,
        borderRadius: 28,
        background: land,
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 54, background: water }} />
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 24,
          top: 120,
          height: 10,
          background: road,
          borderRadius: 6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 90,
          right: 40,
          top: 240,
          height: 10,
          background: road,
          borderRadius: 6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 160,
          top: 40,
          bottom: 40,
          width: 10,
          background: road,
          borderRadius: 6,
        }}
      />
      {marks.map((pin, index) => (
        <div
          key={`${pin.x}-${pin.y}-${index}`}
          style={{
            position: 'absolute',
            left: 36 + pin.x * 300,
            top: 28 + pin.y * 420,
            display: 'flex',
            width: 36,
            height: 36,
            borderRadius: 18,
            background: ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 6, background: tomato }} />
        </div>
      ))}
    </div>
  );
}

export function brandCard() {
  return (
    <ShareCard
      kicker="TEL AVIV"
      title="A map of the places you actually love."
      subtitle="Cafes and restaurants, saved by people."
      pins={[]}
    />
  );
}

export async function renderShareCard(element: React.ReactElement) {
  return new ImageResponse(element, {
    ...OG_SIZE,
    fonts: await ogFonts(),
    headers: OG_HEADERS,
  });
}

function fit(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}
