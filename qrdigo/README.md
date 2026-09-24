# qrdigo

Flutter POS app for qrdigo.

## Push notifications (FCM)

New orders trigger a push notification to every logged-in POS device of the
branch (optionally with a tray alert + sound while the app is open). The
sensitive Firebase credential lives only on the backend; the app only holds a
public registration token.

### Backend (one-time)

1. In the [Firebase console](https://console.firebase.google.com), create a
   project and add an Android app with the application ID
   `com.example.qrdigo`.
2. Download the service account: Project settings → Service accounts →
   Generate new private key. This JSON is the only secret needed.
3. Set `FCM_CREDENTIALS` in `be/.env` to the JSON content or the file path:
   `FCM_CREDENTIALS=/path/to/firebase-adminsdk.json`
   Leave it empty to run without push.
4. Restart the backend. Log line `FCM push enabled` confirms it.

### Flutter app (one-time)

1. Download `google-services.json` from the Firebase Android app and drop it in
   `qrdigo/android/app/`. Without it the app still builds and runs —
   notifications are simply disabled.
2. iOS only: add `GoogleService-Info.plist` under `qrdigo/ios/Runner/` and
   enable push capability in Xcode.

### How it works

- On login, the app registers its FCM token via `POST /api/v1/pos/devices`
  (tokens are tied to the user, so staff leaves without spam).
- Backend sends to all tokens of the order's branch on `order.new`
  (FCM HTTP v1, service account stays server-side).
- Foreground: the app shows a local notification and refreshes the order list.
  Background/terminated: Android renders the system tray notification.
- Logout removes the device token (`DELETE /api/v1/pos/devices`).