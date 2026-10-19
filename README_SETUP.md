# Zenova Alarm Portal — Existing Firebase Project

Configured for the existing Firebase project `znvapp-2a26f`. This bundle includes `admin.html`, `alarm/index.html`, `firebase-config.js`, `firebase-messaging-sw.js`, `functions/index.js`, `functions/package.json`, `firebase.json`, the ringtone, and an ADDITIVE Firestore rules fragment.

## Behaviour
- Students do not sign in, create a profile, enter a name, or supply a UID.
- Admin signs in with Google. Admin authorization is checked against the existing `users/{uid}` document with `role: "admin"`.
- Admin schedules are saved in `alarmSchedules`; the portal reads them live.
- For notifications while the portal is closed, a student/device taps **Enable notifications** once. The browser token is stored in `alarmDevices`, not under a student profile.
- Scheduled Cloud Function sends pushes to registered alarm portal devices for schedules whose target is `all`. Admin-test schedules do not send student pushes.
- Open-page ringing uses `loud.mp3`; autoplay still requires a user interaction in many browsers.

## Before deployment
1. Serve the site on HTTPS. Keep `admin.html`, `firebase-config.js`, `firebase-messaging-sw.js`, `loud.mp3`, and `alarm/` at the site root as shown. Firebase modules do not work from `file://`.
2. In Firebase Authentication, enable Google sign-in and add your website domain to Authorized domains.
3. In Firestore, ensure your own admin UID already has `users/{YOUR_UID}` with `role: "admin"`. Do not allow users to set their own admin role.
4. In Firebase Console → Cloud Messaging → Web Push certificates, generate/get the public VAPID key. Replace `REPLACE_WITH_FIREBASE_CLOUD_MESSAGING_WEB_PUSH_CERTIFICATE_KEY_PAIR_PUBLIC_KEY` in `alarm/index.html`.
5. Merge `firestore-alarm-rules-addition.txt` into your existing Firestore rules. Do NOT replace your existing rules: Zenova already uses other collections. Confirm your current `users` admin role schema before publishing.
6. From the deployment root, merge the `functions/index.js` export into your existing functions code if you already have other functions. Install dependencies from `functions/package.json`. Ensure root `firebase.json` includes the functions source. Deploy only after backing up the existing backend.
7. Firebase scheduled functions require billing/Cloud Scheduler support (typically Blaze). Deploy with `firebase deploy --only functions:dispatchZenovaAlarms` after selecting project `znvapp-2a26f`.
8. Test one schedule with one browser/device first, then scale to all.

## Important limitations
Web push can notify a device while the page is closed if permission/token setup succeeds. A browser cannot guarantee a full-screen incoming call, autoplay ringtone, exact timing, or native alarm behavior while Android is locked or the browser is killed. For that, a native Android app is needed.

## Security note
The alarm schedule is readable publicly because the portal intentionally has no student login. Only the admin role can write schedules. Anonymous devices can register a token document; do not add public read access to `alarmDevices`. Merge the rules fragment carefully and test in the Firebase Rules Playground.
