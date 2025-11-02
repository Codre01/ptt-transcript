# PTT Voice Capture App

A press-to-talk (PTT) voice capture application built with Expo and React Native. The app records audio locally, processes it through a simulated API, and displays transcript results with support for clarification flows and comprehensive error handling.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [Building with EAS](#building-with-eas)
- [Architecture Overview](#architecture-overview)
- [Scenario Switching](#scenario-switching)
- [Audio File Lifecycle](#audio-file-lifecycle)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before running this application, ensure you have the following installed:

### Required Software

- **Node.js** (v22 or higher)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`

- **npm** or **yarn** (comes with Node.js)
  - Verify installation: `npm --version`

- **Expo CLI**
  - Install globally: `npm install -g expo-cli`
  - Or use with npx: `npx expo`

### Platform-Specific Requirements

#### iOS Development (macOS only)

- **Xcode** (latest version recommended)
  - Download from Mac App Store
  - Install Command Line Tools: `xcode-select --install`
  
- **iOS Simulator**
  - Included with Xcode
  - Open via: Xcode → Preferences → Components

#### Android Development

- **Android Studio**
  - Download from [developer.android.com](https://developer.android.com/studio)
  
- **Android SDK & Emulator**
  - Install via Android Studio → SDK Manager
  - Create an emulator via AVD Manager (recommended: Pixel 5 with API 33+)
  
- **Environment Variables** (add to `.bashrc`, `.zshrc`, or equivalent):
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
  # export ANDROID_HOME=$HOME/Android/Sdk        # Linux
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

---

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Codre01/ptt-transcript.git
   cd ptt-transcript
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Verify installation**
   ```bash
   npx expo --version
   ```

---

## Running the App

### Start the Development Server

```bash
npm start
# or
npx expo start
```

This will open the Expo DevTools in your browser with a QR code and options to launch on different platforms.

### Run on iOS Simulator (macOS only)

**Option 1: From Expo DevTools**
- Press `i` in the terminal
- Or click "Run on iOS simulator" in the browser

**Option 2: Direct command**
```bash
npm run ios
# or
npx expo run:ios
```

**First-time setup:**
- The simulator will automatically open if not already running
- Grant microphone permissions when prompted

### Run on Android Emulator

**Direct command**
```bash
npm run android
# or
npx expo run:android
```

**First-time setup:**
- Ensure an emulator is running before launching
- Grant microphone permissions when prompted
- Enable "Install via USB" if prompted

### Run on Physical Device

1. Install the **Expo Go** app from App Store (iOS) or Play Store (Android)
2. Ensure your device is on the same Wi-Fi network as your computer
3. Scan the QR code from Expo DevTools with:
   - iOS: Camera app
   - Android: Expo Go app

---

## Building with EAS

This project is configured for **EAS (Expo Application Services)** builds. EAS allows you to build production-ready apps in the cloud without needing Xcode or Android Studio locally.

### Quick Start

1. **Build for Development**:
   ```bash
   # iOS Simulator
   npm run build:dev:ios
   
   # Android APK
   npm run build:dev:android
   ```

2. **Build for Production**:
   ```bash
   # iOS App Store
   npm run build:prod:ios
   
   # Google Play Store
   npm run build:prod:android
   
   # Both platforms
   npm run build:all
   ```

---

## Architecture Overview

The application follows a clean architecture with clear separation of concerns:

### High-Level Structure

```
┌─────────────────────────────────────────────┐
│           UI Layer (React Components)        │
│  PTTButton, CaptureOverlay, TranscriptList  │
│  ClarificationBanner, ErrorBanner, etc.     │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│      State Management (Zustand Store)        │
│  - App state machine (idle/listening/etc.)  │
│  - Transcript history                        │
│  - Action handlers                           │
└──────┬───────────────────────┬───────────────┘
       │                       │
┌──────▼──────────┐   ┌────────▼──────────────┐
│  Audio Service  │   │  Voice API (Stubbed)  │
│  - Recording    │   │  - Process voice      │
│  - Permissions  │   │  - Scenario control   │
│  - File mgmt    │   │  - Timed responses    │
└─────────────────┘   └───────────────────────┘
```

### Core Components

#### 1. Audio Service (`services/audio/audio-service.ts`)

Handles all audio recording functionality:

- **Permission Management**: Checks and requests microphone access
- **Recording Lifecycle**: Start, stop, and cancel recording
- **File Management**: Saves recordings to cache directory, cleanup old files
- **Duration Tracking**: Real-time recording duration updates

**Key Methods:**
```typescript
- checkPermission(): Promise<boolean>
- requestPermission(): Promise<boolean>
- startRecording(): Promise<void>
- stopRecording(): Promise<AudioRecording>
- cancelRecording(): Promise<void>
- cleanupOldFiles(): Promise<void>
```

#### 2. Voice API (`services/voice-api/stub-voice-api.ts`)

Simulates voice processing with configurable scenarios:

- **Timed Responses**: Configurable delay (default 1000ms)
- **Scenario-Based**: Success, clarification, network error, server error
- **Clarification Tracking**: Maintains state for multi-turn interactions

**Response Types:**
```typescript
- { kind: 'ok', transcript: string }
- { kind: 'clarification', prompt: string, clarificationId: string }
- { kind: 'error', code: 'NETWORK' | 'SERVER', message: string }
```

#### 3. Zustand Store (`store/voice-store.ts`)

Centralized state management using a finite state machine:

**States:**
- `idle` - Ready for input
- `checkingPermission` - Requesting microphone access
- `permissionDenied` - User denied permission
- `listening` - Actively recording
- `processing` - Sending to API
- `result` - Displaying transcript
- `clarification` - Showing clarification prompt
- `error` - Displaying error message

**State Transitions:**
```
idle → checkingPermission → listening → processing
                                ↓
                    result / clarification / error
                                ↓
                              idle
```

#### 4. UI Components

- **PTTButton**: Main press-and-hold recording button with visual states
- **TranscriptList**: Scrollable history of past transcripts
- **ClarificationBanner**: Yellow banner showing clarification prompts
- **ErrorBanner**: Red banner for error messages with auto-dismiss
- **ScenarioSelector**: Developer control for switching API scenarios

### Data Flow

1. User presses PTT button → Store checks permissions
2. Permission granted → AudioService starts recording
3. User releases button → AudioService stops and saves file
4. Store calls VoiceAPI with audio file URI
5. VoiceAPI returns result after simulated delay
6. Store updates state and UI reflects changes
7. AudioService cleans up processed files

---

## Scenario Switching

The app includes a **Scenario Selector** at the top of the screen for testing different API behaviors without code changes.

### Available Scenarios

#### 1. Success (Default)
- **Behavior**: Returns a successful transcript after delay
- **Response**: `"Added 'milk' to your shopping list."`
- **Use Case**: Testing happy path flow

#### 2. Clarification
- **Behavior**: First call returns a clarification prompt, second call returns success
- **Response**: `"What time should I set it for?"`
- **Use Case**: Testing multi-turn interactions
- **Flow**:
  1. Record first utterance → Clarification prompt appears
  2. Record follow-up → Normal transcript returned

#### 3. Network Error
- **Behavior**: Simulates network connectivity failure
- **Response**: `"Network error. Please try again."`
- **Use Case**: Testing offline/connectivity error handling
- **Recovery**: Returns to idle state, preserves previous transcripts

#### 4. Server Error
- **Behavior**: Simulates server-side processing failure
- **Response**: `"Something went wrong. Please try again."`
- **Use Case**: Testing server error handling
- **Recovery**: Returns to idle state, preserves previous transcripts

### How to Switch Scenarios

1. Launch the app
2. Locate the **Scenario Selector** at the top of the screen
3. Tap to select: Success / Clarification / Network Error / Server Error
4. Record audio to test the selected scenario
5. Selection persists across app restarts (stored in AsyncStorage)

### Testing Tips

- **Clarification Flow**: Switch to "Clarification", record once (see prompt), record again (see transcript)
- **Error Recovery**: Switch to error scenarios, record, dismiss error, switch back to "Success" and retry
- **State Persistence**: Close and reopen app to verify scenario selection persists

---

## Audio File Lifecycle

### Storage Location

All audio recordings are stored in the app's **cache directory**:

```
FileSystem.cacheDirectory + 'recordings/'
```

- **iOS**: `~/Library/Caches/ptt-transcript/recordings/`
- **Android**: `/data/data/ptt-transcript/cache/recordings/`

### File Format

- **Format**: M4A (MPEG-4 Audio)
- **Encoding**: AAC (Advanced Audio Coding)
- **Quality**: High quality, optimized for voice
- **MIME Type**: `audio/m4a` (iOS) and (Android)

### Lifecycle Stages

#### 1. Recording Creation
```
User holds PTT button
  ↓
AudioService.startRecording()
  ↓
File created: recordings/recording-{timestamp}.m4a
  ↓
Duration tracked in real-time (100ms intervals)
```

#### 2. Recording Completion
```
User releases PTT button
  ↓
AudioService.stopRecording()
  ↓
Returns: { uri, duration, mimeType }
  ↓
File saved to cache directory
```

#### 3. Processing
```
Store calls VoiceAPI.processVoice({ audioUri, ... })
  ↓
Simulated network delay (500-2000ms)
  ↓
Returns transcript or error
```

#### 4. Cleanup

**Immediate Cleanup:**
- **On Cancel**: File deleted immediately when user cancels recording
- **On Error**: File deleted after error is handled

**Scheduled Cleanup:**
- **On App Start**: `AudioService.cleanupOldFiles()` runs automatically
- **Criteria**: Deletes files older than 24 hours
- **Purpose**: Prevents cache bloat from failed/interrupted recordings

### Cleanup Strategy

```typescript
// Automatic cleanup on app initialization
useEffect(() => {
  AudioService.cleanupOldFiles();
}, []);
```

### Storage Considerations

- **Cache Directory**: System can clear if device storage is low
- **No Sensitive Data**: All recordings are temporary and contain no PII
- **Minimal Footprint**: Files deleted promptly after processing
- **No Cloud Storage**: Everything stays local on device

---

## Troubleshooting

### Common Issues

#### App Won't Start

**Problem**: `expo start` fails or shows errors

**Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install

# Clear Expo cache
npx expo start -c

# Reset Metro bundler
watchman watch-del-all  # macOS only
```

#### iOS Simulator Issues

**Problem**: Simulator doesn't open or app doesn't install

**Solutions:**
- Ensure Xcode is installed and up to date
- Reset simulator: Device → Erase All Content and Settings
- Check Xcode Command Line Tools: `xcode-select -p`
- Reinstall if needed: `sudo xcode-select --reset`

**Problem**: "No devices found"

**Solutions:**
```bash
# List available simulators
xcrun simctl list devices

# Boot a specific simulator
xcrun simctl boot "iPhone 15"
```

#### Android Emulator Issues

**Problem**: Emulator won't start or is very slow

**Solutions:**
- Enable hardware acceleration (HAXM on Intel, Hypervisor on M1/M2)
- Increase emulator RAM in AVD Manager (4GB recommended)
- Use a newer system image (API 33+)
- Cold boot the emulator (uncheck "Quick Boot")

**Problem**: "Unable to connect to emulator"

**Solutions:**
```bash
# Check ADB connection
adb devices

# Restart ADB server
adb kill-server
adb start-server

# Verify ANDROID_HOME
echo $ANDROID_HOME
```

#### Microphone Permission Issues

**Problem**: Permission denied or not requested

**Solutions:**

**iOS Simulator:**
- Reset permissions: Device → Erase All Content and Settings
- Or: Settings → Privacy & Security → Microphone → Toggle app

**Android Emulator:**
- Settings → Apps → ptt-transcript → Permissions → Microphone → Allow
- Or reinstall the app

**Physical Device:**
- iOS: Settings → Privacy → Microphone → ptt-transcript
- Android: Settings → Apps → ptt-transcript → Permissions

#### Recording Issues

**Problem**: Recording doesn't start or fails immediately

**Solutions:**
- Check microphone permissions (see above)
- Verify audio input device is available (simulator/emulator)
- Check console for error messages
- Try restarting the app

**Problem**: No audio recorded (0 duration)

**Solutions:**
- iOS Simulator: Ensure "Input" is set in I/O settings
- Android Emulator: Virtual microphone may not work; use physical device
- Check if another app is using the microphone

#### State/UI Issues

**Problem**: App stuck in "Processing" state

**Solutions:**
- Check console for API errors
- Verify scenario selector is set correctly
- Force close and restart app
- Clear app data and reinstall

**Problem**: Transcripts not appearing

**Solutions:**
- Check if scenario is set to error mode
- Verify store state in React DevTools
- Check console for state update errors

#### Build/Dependency Issues

**Problem**: TypeScript errors or missing types

**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript version
npx tsc --version
```

**Problem**: Expo modules not found

**Solutions:**
```bash
# Rebuild native modules
npx expo prebuild --clean

# Or reinstall Expo
npm install expo@latest
```