# Zenova Educations — Firebase Alarm Integration

This bundle integrates the existing Firebase project `zenova-educations` with:
- `admin.html` — Google sign-in, admin-role gate, create/edit/pause/delete schedules, live Firestore listener.
- `alarm/index.html` — student Google sign-in, batch profile, live schedule listener, in-page simulated ringing, 10-minute fresh-up timer, second reminder, student response events, FCM token registration.
- `firebase-messaging-sw.js` — background web push notification display and click-to-open behavior.
- `firestore.rules` — initial security rules.
- `functions/` — scheduled Cloud Function that checks enabled schedules every minute and sends FCM pushes to enrolled student device tokens.

## Important truth about “automatic ringing”
The Firebase scheduled function can dispatch a push notification around the scheduled minute. Web push can display a notification while the page is closed, but browsers/Android do not guarantee that a website can autoplay ringtone, launch a full-screen call screen, or run a precise 10-minute timer when the phone is locked. For reliable locked-screen alarm behavior, package the portal as an Android app and implement native Android exact alarms/full-screen notifications with the appropriate user-granted permissions. The web portal currently simulates the call when it is active; push notifications are the wake-up signal when it is not active.

## Setup steps

1. Put `admin.html`, `firebase-config.js`, and `firebase-messaging-sw.js` at the website root. Put `index.html` in `/alarm/`.
2. Serve the site over HTTPS (or localhost for development). Firebase modules will not work from `file://`.
3. In Firebase Console → Authentication → Sign-in method, enable Google. Add your hosting domain under Authentication → Settings → Authorized domains.
4. In Firestore, create `users/{YOUR_ADMIN_AUTH_UID}` with at least:
   ```json
   { "role": "admin", "email": "your-admin-email@example.com", "name": "Zenova Admin" }
   ```
   Do this manually from Firebase Console for the first admin. Do not let a user grant themselves the admin role.
5. In Firebase Console → Cloud Messaging → Web Push certificates, generate/get the Web Push public key. Replace `REPLACE_WITH_FIREBASE_CLOUD_MESSAGING_WEB_PUSH_CERTIFICATE_KEY_PAIR_PUBLIC_KEY` in `alarm/index.html` with the public key.
6. Apply the rules from `firestore.rules` in Firebase Console → Firestore Database → Rules.
7. Install Firebase CLI and sign into the same Firebase account. From this folder run:
   ```bash
   firebase login
   firebase use zenova-educations
   firebase deploy --only firestore:rules,functions
   ```
   If no `firebase.json` exists in your deployment root, add one that references `firestore.rules` and `functions` (example below).
8. Configure `firebase.json`:
   ```json
   {
     "firestore": { "rules": "firestore.rules" },
     "functions": [{ "source": "functions", "codebase": "default" }]
   }
   ```
9. Student logs in with Google and saves a profile with the exact `batchId` used in an admin schedule. The student then taps “Enable push notifications”; allow notifications.
10. Test with an `admin` target first. Admin-only schedules intentionally send no student pushes. Then test with one test student and a `batch` schedule before selecting `all`.

## Firestore schema

- `users/{uid}`: `role` (`admin` or `student`), `name`, `email`, `batchId`
- `users/{uid}/devices/{token}`: FCM `token`, `platform`, `updatedAt`
- `users/{uid}/alarmEvents/{eventId}`: student acknowledgement events
- `alarmSchedules/{scheduleId}`:
  ```json
  {
    "name": "5 AM Study Wake-up",
    "time": "05:00",
    "timezone": "Asia/Kolkata",
    "days": [0,1,2,3,4,5,6],
    "target": "admin",
    "batchId": null,
    "ringSeconds": 60,
    "enabled": true
  }
  ```
- `alarmDispatches/{scheduleId_minuteKey}`: idempotency lock / dispatch result per schedule and minute.

## Existing app compatibility
This is a Firebase-connected implementation of the alarm feature, not a replacement of the rest of the existing Zenova app. It uses the current project ID/config from the existing Zenova Firebase project. Review any existing Firestore rules and user-profile schema before replacing rules or merging the `users` collection fields. Back up the current rules first. Do not overwrite existing collections.

## Limitations / security
- The provided Firestore rules are a starting point; merge them carefully with existing Zenova rules because your project already has other collections/features. Signed-in students can read alarm schedule metadata so their portal can subscribe and filter by batch; only admins can create, edit, pause, or delete schedules.
- A user who has not been assigned a batch will not receive batch-specific alarms.
- Cloud Functions deployment may require enabling billing (Blaze plan), Cloud Scheduler, and Cloud Messaging in the Firebase/Google Cloud project.
- The Firebase web config is not a server credential, but the Firestore rules and admin role checks are essential.
- This package cannot deploy itself into your Firebase project because it does not have access to your Firebase Console or CLI login.
