# EAS Build Setup Guide

This guide covers how to build and deploy the PTT Transcript app using EAS (Expo Application Services).

## Prerequisites

- **Expo Account**: Sign up at [expo.dev](https://expo.dev)
- **EAS CLI**: Already installed globally (`eas-cli`)
- **Apple Developer Account**: Required for iOS builds (paid)
- **Google Play Console Account**: Required for Android production builds (paid)

## Initial Setup

### 1. Login to EAS

```bash
eas login
```

Enter your Expo account credentials.

### 2. Configure Your Project

```bash
eas build:configure
```

This will:
- Create/update `eas.json` (already created)
- Generate a project ID and add it to `app.json`
- Link your local project to your Expo account

### 3. Update Project ID

After running `eas build:configure`, your `app.json` will be updated with a real project ID. The placeholder `"com.codre.ptttranscript"` will be replaced automatically.

## Build Profiles

The project includes three build profiles in `eas.json`:

### Development Build
- **Purpose**: Testing on simulators/emulators and physical devices
- **iOS**: Builds for simulator
- **Android**: Builds APK for easy installation
- **Command**: 
  ```bash
  npm run build:dev:ios
  npm run build:dev:android
  ```

### Preview Build
- **Purpose**: Internal testing before production
- **iOS**: Builds for physical devices (requires provisioning profile)
- **Android**: Builds APK
- **Command**:
  ```bash
  npm run build:preview:ios
  npm run build:preview:android
  ```

### Production Build
- **Purpose**: App Store and Google Play submission
- **iOS**: Builds IPA for App Store
- **Android**: Builds AAB (App Bundle) for Google Play
- **Command**:
  ```bash
  npm run build:prod:ios
  npm run build:prod:android
  npm run build:all  # Both platforms
  ```

## Building Your App

### iOS Builds

#### Development (Simulator)
```bash
npm run build:dev:ios
```
- Builds for iOS Simulator
- No Apple Developer account required
- Download and drag to simulator to install

#### Preview/Production (Physical Device)
```bash
npm run build:preview:ios
# or
npm run build:prod:ios
```
- Requires Apple Developer account ($99/year)
- EAS will prompt you to:
  - Generate or select a provisioning profile
  - Generate or select a distribution certificate
- First build takes ~15-20 minutes

### Android Builds

#### Development/Preview (APK)
```bash
npm run build:dev:android
# or
npm run build:preview:android
```
- Builds APK file
- No Google Play account required
- Download and install directly on device
- Build takes ~10-15 minutes

#### Production (App Bundle)
```bash
npm run build:prod:android
```
- Builds AAB for Google Play Store
- Requires Google Play Console account ($25 one-time)
- Build takes ~10-15 minutes

## Build Process

1. **Trigger Build**:
   ```bash
   eas build --profile development --platform ios
   ```

2. **Monitor Progress**:
   - View build logs in terminal
   - Or visit: https://expo.dev/accounts/[your-account]/projects/ptt-transcript/builds

3. **Download Build**:
   - Builds are hosted on EAS servers
   - Download link provided when build completes
   - Valid for 30 days (can be extended)

4. **Install**:
   - **iOS Simulator**: Drag .app file to simulator
   - **Android Emulator**: `adb install app.apk`
   - **Physical Device**: Use QR code or download link

## Credentials Management

EAS automatically manages signing credentials:

### iOS
- **Development**: Auto-generated provisioning profile
- **Production**: You can let EAS manage or provide your own

### Android
- **Keystore**: EAS generates and stores securely
- **Upload Key**: Managed by EAS for Google Play

View credentials:
```bash
eas credentials
```

## Environment Variables

For production builds with secrets:

1. Create `.env` file (already in `.gitignore`):
   ```
   API_KEY=your-api-key
   ```

2. Add to `eas.json` build profile:
   ```json
   "production": {
     "env": {
       "API_KEY": "your-api-key"
     }
   }
   ```

3. Or use EAS Secrets:
   ```bash
   eas secret:create --name API_KEY --value your-api-key
   ```

## Submitting to Stores

### iOS App Store

```bash
eas submit --platform ios
```

Requirements:
- Production build completed
- App Store Connect app created
- App Store Connect API key (EAS will guide you)

### Google Play Store

```bash
eas submit --platform android
```

Requirements:
- Production build completed
- Google Play Console app created
- Service account JSON key (EAS will guide you)

## Common Commands

```bash
# Check build status
eas build:list

# View specific build
eas build:view [build-id]

# Cancel running build
eas build:cancel

# View credentials
eas credentials

# Update app version
# Edit version in app.json, then rebuild
```

## Troubleshooting

### Build Fails

1. **Check build logs**: Click the build URL or run `eas build:view [build-id]`
2. **Common issues**:
   - Missing dependencies: Ensure all packages in `package.json` are compatible
   - Native module issues: Some packages require custom native code
   - Provisioning errors (iOS): Re-run `eas credentials` to regenerate

### iOS Provisioning Issues

```bash
# Clear and regenerate credentials
eas credentials --platform ios
# Select "Remove provisioning profile" then rebuild
```

### Android Keystore Issues

```bash
# View keystore info
eas credentials --platform android
```

## Local Development vs EAS

- **Local Development**: `npm start` → Expo Go app
- **Development Build**: Custom native code, installed via EAS build
- **Production Build**: Optimized, signed, ready for stores

## Cost

- **EAS Free Tier**: 
  - 30 builds/month
  - Sufficient for this project
  
- **EAS Production**:
  - Unlimited builds
  - Priority queue
  - $29/month

## Next Steps

1. Run `eas login`
2. Run `eas build:configure`
3. Start with a development build: `npm run build:dev:android`
4. Test on emulator/device
5. When ready, create production builds for store submission

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)
