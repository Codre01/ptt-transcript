# Quick Start - EAS Build

Get your PTT app built and running in minutes.

## Step 1: Login

```bash
eas login
```

## Step 2: Configure

```bash
eas build:configure
```

This updates `app.json` with your project ID.

## Step 3: Build

### For Testing (Recommended First)

```bash
# Android APK (easiest)
npm run build:dev:android
```

Wait ~10-15 minutes. You'll get a download link.

### For iOS Simulator

```bash
npm run build:dev:ios
```

### For Production

```bash
# Both platforms
npm run build:all
```

## Step 4: Install

- **Android**: Download APK and install on device/emulator
- **iOS**: Download and drag to simulator

## That's It!

For detailed instructions, see [EAS_SETUP.md](./EAS_SETUP.md)
