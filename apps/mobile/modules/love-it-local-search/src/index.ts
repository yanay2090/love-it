import { requireOptionalNativeModule } from 'expo';

export interface LocalSearchRow {
  name?: string;
  latitude?: number;
  longitude?: number;
  id?: string;
  category?: string;
  subtitle?: string;
  neighborhood?: string;
  address?: string;
}

interface LoveItLocalSearchNative {
  search(query: string, latitude: number, longitude: number): Promise<LocalSearchRow[]>;
}

/** Null on Android, web, and until the dev client is rebuilt with this module. */
export function getLoveItLocalSearch(): LoveItLocalSearchNative | null {
  return requireOptionalNativeModule<LoveItLocalSearchNative>('LoveItLocalSearch');
}
