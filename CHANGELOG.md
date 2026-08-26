# Changelog — Mobile

All notable changes to the mobile app will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

---

## [0.1.0] — 2026-08-27

### Added
- Initial mobile app (React Native + Expo)
- Firebase App Distribution for APK distribution
- Expo prebuild for native project generation
- Expo export:embed for JS bundling
- Node 22 for CI/CD
- Flatten directory structure (no more nested `mobile/`)

### Changed
- Workflows now use root paths (`src/`, `package.json`)
- Bundle JS using `expo export:embed` instead of `react-native bundle`

### Fixed
- Bundle JS before APK build (fix 'Unable to load script')

---

## Features

- React Native 0.86 + Expo SDK 57
- Firebase Auth + Firestore
- LiveKit video/audio calls
- Live location sharing
- Stickers, mentions
- Push notifications
- File sharing (chunked upload)
