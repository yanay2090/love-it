'use client';

import { track } from '../lib/analytics';

export function OpenAppButton({
  handle,
  placeId,
  label = 'Open in the app',
}: {
  handle: string;
  placeId?: string;
  label?: string;
}) {
  const appUrl = placeId ? `loveit://place/${placeId}` : `loveit://u/${handle}`;
  const installHref = process.env.NEXT_PUBLIC_APP_STORE_URL || '/#get-the-app';

  return (
    <div className="cta-row">
      <a
        className="button coral"
        href={appUrl}
        onClick={() => track('public_page_cta_clicked', { handle, cta: 'open_app' })}
      >
        {label}
      </a>
      <a
        className="button ghost"
        href={installHref}
        onClick={() => track('public_page_cta_clicked', { handle, cta: 'install' })}
      >
        Get the iPhone app
      </a>
    </div>
  );
}
