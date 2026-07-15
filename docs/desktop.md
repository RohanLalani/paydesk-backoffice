# PayDesk Back Office Desktop

The Tauri desktop shell packages the static Next.js export from `out` and connects to the hosted PayDesk backend at `https://api.paydeskapp.com`. It does not embed or start the backend.

Production desktop builds use `NEXT_PUBLIC_API_URL=https://api.paydeskapp.com` by default through the frontend API client. If `NEXT_PUBLIC_API_URL` is set for a production build, it must not point to `localhost` or `127.0.0.1`.

Authentication remains compatible with the current web app and keeps tokens in browser storage. For a future hardening pass, move desktop token storage to Tauri Stronghold or another OS-backed secure storage mechanism without changing the backend auth contract.

Stripe billing continues to use the hosted Stripe flow. Opening Checkout in the system browser is acceptable for desktop; a future deep-link callback such as `paydesk://billing/success` can return users to the desktop app after billing completes.

The desktop shell does not grant shell or filesystem permissions. Camera and barcode flows continue to rely on the WebView browser APIs used by the current Items page.
