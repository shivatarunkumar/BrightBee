# BrightBee

A cross-platform mobile app for children (Nursery – Class 5) to take AI-generated subject tests, receive instant feedback, and track progress over time. Parents manage child profiles and view progress reports.

---

## Project Structure

```
BrightBee/
  apps/
    mobile/          # React Native + Expo app (this README covers this)
  kids-learning-app-spec.md
  CLAUDE.md
```

---

## Requirements

### System Requirements

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 18.x or later | [nodejs.org](https://nodejs.org) |
| npm | 9.x or later | Comes with Node.js |
| Expo CLI | Latest | `npm install -g expo-cli` |
| Git | Any recent | For version control |

### For iOS Simulator (macOS only)

| Tool | Requirement |
|------|-------------|
| macOS | 13 (Ventura) or later |
| Xcode | 15 or later — download from the Mac App Store |
| Xcode Command Line Tools | Run: `xcode-select --install` |
| iOS Simulator | Installed via Xcode → Platforms → iOS |

### For Expo Go (physical device)

- Install **Expo Go** from the App Store (iOS) or Google Play (Android)
- Device and development machine must be on the same Wi-Fi network

---

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd BrightBee
```

### 2. Install dependencies

```bash
cd apps/mobile
npm install
```

---

## Running the App

### On iOS Simulator

Make sure Xcode is installed and a simulator is set up (Xcode → Window → Devices and Simulators).

```bash
cd apps/mobile
npx expo start --ios
```

This will:
1. Start the Expo dev server
2. Automatically open the iOS Simulator
3. Install and launch the BrightBee app

To choose a specific simulator device, press `i` in the terminal after the dev server starts, then select from the list.

### On a Physical iOS Device with Expo Go

```bash
cd apps/mobile
npx expo start
```

Then:
1. Open the **Camera** app on your iPhone and scan the QR code shown in the terminal
2. Tap the notification to open in **Expo Go**

### On Android Emulator

```bash
cd apps/mobile
npx expo start --android
```

Requires Android Studio with a configured AVD (Android Virtual Device).

### On Android Device with Expo Go

```bash
cd apps/mobile
npx expo start
```

Open **Expo Go** on your Android device and scan the QR code.

---

## Available Scripts

From `apps/mobile/`:

| Script | Description |
|--------|-------------|
| `npm start` | Start the Expo dev server (choose platform interactively) |
| `npm run ios` | Start and open iOS simulator |
| `npm run android` | Start and open Android emulator |
| `npm run web` | Start the web version in browser |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React Native + Expo (SDK 52) |
| Navigation | React Navigation (Native Stack) |
| Language | TypeScript |
| State | Redux Toolkit / Zustand (Phase 2+) |
| Backend | Node.js + Express (Phase 2+) |
| Database | PostgreSQL + Prisma (Phase 2+) |
| AI | Anthropic Claude API — server-side only |

---

## Current Status

**Phase 1 — In Progress**

- [x] Project setup (Expo, TypeScript, React Navigation)
- [x] Welcome / onboarding screen
- [x] Login screen (UI)
- [ ] Register screen (UI)
- [ ] Auth API integration (backend)
- [ ] Child profile creation

See `kids-learning-app-spec.md` for the full feature roadmap and build phases.

---

## Troubleshooting

**`npx expo start` fails with "Metro bundler not found"**
```bash
npm install
npx expo start --clear
```

**iOS Simulator doesn't open automatically**
- Ensure Xcode is installed and you have accepted the license: `sudo xcodebuild -license accept`
- Open Simulator manually: `open -a Simulator`, then press `i` in the Expo terminal

**"Unable to find expo in this project" error**
```bash
cd apps/mobile
npm install
```

**Expo Go shows a blank screen**
- Make sure your phone and computer are on the same Wi-Fi network
- Try switching from LAN to Tunnel mode: press `s` → select **Tunnel** in the Expo terminal
