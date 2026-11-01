import { projectToPercent } from '@love-it/shared';

export interface WebPin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  href: string;
  initials?: string;
  color?: string;
}

export function PinMap({ pins }: { pins: WebPin[] }) {
  return (
    <div className="pin-map" aria-label="Map of saved places in Tel Aviv">
      <div className="water" />
      <div className="park" />
      <span className="area a1">Lev Ha&apos;ir</span>
      <span className="area a2">Rothschild</span>
      <span className="area a3">Florentin</span>
      <span className="area a4">Neve Tzedek</span>
      {pins.map((pin) => {
        const point = projectToPercent(pin.lat, pin.lng);
        return (
          <a
            key={pin.id}
            href={pin.href}
            className="map-pin"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <span className="pin-face" style={{ background: pin.color ?? '#FF5A6C' }}>
              {pin.initials ?? '♥'}
            </span>
            <span className="pin-label">{pin.name}</span>
          </a>
        );
      })}
    </div>
  );
}
