# Sign-in setup

Love it 1.0 signs in with Apple, Google, or an email code. There is no password. Authenticator-app MFA is not part of 1.0. It can be added after the December 1, 2026 launch if you want a second factor.

The iPhone app only ships the publishable key (`sb_publishable_...`). Never put an `sb_secret_` key in `apps/mobile`.

Bundle ID: `com.yanaybenyosef.loveit`.

Supabase project: `jjrahfknqkrqtjgygmhl`.

After this checklist, rebuild the dev client. A JavaScript reload does not pick up the Google URL scheme, or the Sign in with Apple entitlement when you turn that on.

`LOVEIT_APPLE_SIGNIN` defaults to off. A free Personal Team build does not request `com.apple.developer.applesignin`, and the sign-in screen shows Google and email only. Set `LOVEIT_APPLE_SIGNIN=1` in `apps/mobile/.env` after the App ID has the Sign in with Apple capability, then rebuild. The Apple button appears only in that build.

```bash
cd apps/mobile
npx expo run:ios --device
```

A free Personal Team can install this app. Leave `LOVEIT_APPLE_SIGNIN` unset so the entitlement is not in the binary. Google and email code do not need it.

## 1. Supabase providers

In the dashboard for project `jjrahfknqkrqtjgygmhl`:

1. Authentication → Sign In / Providers → **Apple**. Enable it. You will paste the Services ID, team ID, key ID, and private key after the paid Apple account can create a Sign in with Apple key. Until then, the Apple button in the app will not complete.
2. Authentication → Sign In / Providers → **Google**. Enable it. Paste the **Web** client ID and the Web client secret from Google Cloud. Add the **iOS** client ID to the authorized client IDs list if the form has that field.
3. Authentication → Sign In / Providers → **Email**. Enable it. Turn on email sign-in. People receive a 6-digit code, not a magic link and not a password.

## 2. Email template

Authentication → Emails → the magic link / OTP template. The message body must include the code:

```text
{{ .Token }}
```

The app reads that 6-digit code on the verify screen. It does not open a link.

## 3. Google Cloud OAuth

In Google Cloud Console, same project:

1. OAuth consent screen, external or internal, with the Love it name.
2. Create an **iOS** OAuth client. Bundle ID `com.yanaybenyosef.loveit`. Copy the client ID (`….apps.googleusercontent.com`).
3. Create a **Web** OAuth client. Copy that client ID too. Supabase uses the Web client as the token audience.
4. Put them in `apps/mobile/.env`:

```bash
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

`apps/mobile/app.config.ts` turns the iOS client ID into the reversed scheme `com.googleusercontent.apps.<prefix>` and passes it to the Google Sign-In config plugin. Change the iOS client ID only with a new native build.

## 4. Sign in with Apple, after the paid account

1. Apple Developer → Identifiers → `com.yanaybenyosef.loveit` → enable Sign in with Apple.
2. Create a Sign in with Apple key. Note the key ID, team ID, and download the `.p8` once.
3. Supabase Apple provider: Services ID, team ID, key ID, and the `.p8` contents.
4. In `apps/mobile/.env` set `LOVEIT_APPLE_SIGNIN=1`.
5. Rebuild with `npx expo run:ios --device` using the paid team, not the free Personal Team.

That flag is what adds `ios.usesAppleSignIn` and the `expo-apple-authentication` config plugin, which request `com.apple.developer.applesignin`. With the flag off, those are omitted.

## 5. App environment

`apps/mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://jjrahfknqkrqtjgygmhl.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

Apply the account-deletion migration if it is not on the project yet:

```bash
supabase db push
```

That includes `supabase/migrations/0004_delete_own_account.sql`. The app calls `delete_own_account` from My page → ··· → Delete account.

## 6. What to try on the phone

1. Browse Explore while signed out. Opening + Add or a heart asks you to sign in.
2. With `LOVEIT_APPLE_SIGNIN` off, the screen shows Google, then email. After you set the flag and rebuild, Apple is the black system button above Google.
3. Email: request a code, type the 6 digits, then pick a handle. Reserved names such as `login` and `places` are rejected.
4. Kill and reopen the app. The session should still be there.
5. My page → ··· → Sign out, and Delete account.

Local saves already on the phone (the demo diary) are copied onto the account once, the first time that account signs in on this device.
