# Changelog — Web

All notable changes to the web app will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

---

## [0.4.0] — 2026-08-27

### Added
- Live location map: route follows road (OSRM via routing.openstreetmap.de)
- Transport mode selector: 🚶 foot / 🚴 bike / 🚗 car
- Route redraws automatically on profile change
- Distance popup on marker click (Haversine formula)
- Distance chip in sidebar for each user
- Re-center button (zoom to max)
- My position marker (blue dot)
- Loading indicator while fetching route
- Click map to clear selection
- Staging channel deploy workflow
- Node 22 for CI/CD

### Changed
- Flatten directory structure: `web/` → root (no more nested `web/`)
- Workflows now use root paths (`src/`, `package.json`)
- `firebase.json` public path: `web/dist` → `dist`
- File retention: >100MB = 24h, ≤100MB = 3d

### Removed
- `mobile/` directory (separate codebase on `mobile` branch)
- `mobile-deploy.yml` (mobile has its own branch)
- Legacy Vue app (`src/`)
- Follow selected user feature from live map

---

## [0.3.0] — 2026-08-26

### Added
- Size-based file retention (>100MB = 24h, ≤100MB = 3d)
- Expired file UX: ResolvedImage placeholder, downloadAttachment 404 message
- Attachment preview panel with caption
- Call invites (link + channel message)
- Sidebar hide/show toggle (hamburger)
- Live location share

### Fixed
- Announce call even when 'connected' event fires before listeners
- Move theme toggle out of fixed overlay covering the call button
- Collapse drawer root width when sidebar hidden
- Rotate LiveKit credentials

---

## [0.2.0] — 2026-08-25

### Added
- Vite + React + TypeScript + MUI + Zustand
- OAuth authentication
- Channels, chat realtime + pagination
- Attachments + chunked upload
- LiveKit calls
- Notifications
- Admin cleanup
- Countdown, clipboard paste
- WhatsApp-style attachment preview
- Emoji picker, ImageViewer
- Stickers, mentions, search
- Pin/unpin, hide

---

## [0.1.0] — 2026-08-20

### Added
- Initial project setup
- Firebase Hosting deployment
