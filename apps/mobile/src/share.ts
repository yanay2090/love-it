import { Platform, Share } from 'react-native';

/**
 * Share the bare https URL. iMessage reads `url` for the link card.
 * WhatsApp on iPhone reads `message`, so the URL has to be there too,
 * with no caption in front of it.
 */
export async function sharePublicUrl(url: string): Promise<void> {
  if (Platform.OS === 'ios') {
    await Share.share({ message: url, url });
    return;
  }
  await Share.share({ message: url });
}
