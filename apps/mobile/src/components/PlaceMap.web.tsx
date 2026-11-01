import type { MapPin } from '@love-it/shared';
import { forwardRef, useImperativeHandle } from 'react';
import { IllustratedMap } from './IllustratedMap';

export interface PlaceMapHandle {
  recenter: (point?: { lat: number; lng: number }) => void;
}

export const PlaceMap = forwardRef<
  PlaceMapHandle,
  { pins: MapPin[]; selectedId?: string; onSelect: (placeId: string) => void }
>(function PlaceMap(props, ref) {
  useImperativeHandle(ref, () => ({ recenter: () => undefined }));
  return <IllustratedMap {...props} />;
});
