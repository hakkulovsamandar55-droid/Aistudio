# AI Studio — Frontend

React (Vite) single-page app for AI Studio.

## Stack

- React + Vite (JavaScript)
- React Router
- Tailwind CSS
- Axios (with automatic JWT refresh on 401)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template:

   ```bash
   cp .env.example .env.local
   ```

   `VITE_API_URL` should point at the backend's `/api` base
   (`http://localhost:4000/api` by default).

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Opens on `http://localhost:5173`. The backend must be running (see
   `../backend/README.md`) for anything beyond the landing page to work.

## Project structure

```
src/
  api/         axios client + per-resource API modules
  components/  shared UI (Layout, AdminLayout, StylePicker, banners, guards)
  context/     AuthContext (session state) + ToastContext (notifications)
  pages/       route-level pages
    admin/     admin-only pages
```

## Routes

| Path | Page | Access |
|---|---|---|
| `/` | Landing page | Public |
| `/gallery` | Community gallery of shared work | Public |
| `/login`, `/register` | Auth (register accepts `?ref=CODE`) | Public |
| `/forgot-password`, `/reset-password` | Password recovery | Public |
| `/billing/success`, `/billing/cancel` | Stripe return pages | Public |
| `/dashboard` | Balance, daily bonus, referrals, recent work | User |
| `/generate/image` | Image generation with style presets | User |
| `/generate/video` | Video generation with polling | User |
| `/history` | Past generations: search, filters, favourite/share/delete | User |
| `/billing` | Credit packages → Stripe checkout | User |
| `/settings` | Profile, password, referral code, personal stats | User |
| `/admin`, `/admin/users`, `/admin/generations`, `/admin/packages`, `/admin/announcements` | Admin panel | Admin |

Protected routes sit behind `ProtectedRoute`; admin routes behind
`AdminRoute`, which redirects non-admins to `/dashboard`. These guards are a
UX convenience — the server enforces the same rules independently.

## Notes

- **Downloads** go through the API's download endpoint and are saved via a
  blob URL, because a cross-origin `<a download>` is ignored by browsers.
- **Toasts** come from `useToast()` (`success` / `error` / `info`).
- **Token refresh** is automatic: a 401 triggers one shared refresh call and
  the original request is retried; if the refresh itself fails, an
  `auth:session-expired` event clears the session.
