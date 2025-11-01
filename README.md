# PTT Voice Capture App

A press-to-talk (PTT) voice capture application built with Expo and React Native. The app records audio locally, processes it through a simulated API, and displays transcript results with support for clarification flows and comprehensive error handling.

**Platform:** Expo (managed workflow) + TypeScript + Zustand
# What you’ll build
## Core user flow
1. **Hold to talk**
    *   While the button is held: start recording and show a capture sheet/overlay.
    *   On release: stop recording, **save the audio file locally**, and move to **Processing**.
2. **Processing (simulated network)**
    *   Call a **stubbed** **`VoiceApi`** that resolves after a delay (1000 ms by default) and returns a **transcript string**.
    *   Show **Processing…** UI until the result arrives.
3. **Result (Transcript)**
    *   Display the transcript prominently in the UI.
    *   If the API asks for a **clarification**, show the prompt and return the user to **PTT** to provide the follow-up utterance. The second utterance should produce a normal transcript result.
4. **Cancel**
    *   While recording, a **Cancel** action must discard the current recording and return to Idle.
> Note: **No TTS playback** is required in this assignment.
## Scope constraints (locked)
*   **Transcript only:** The AI “response” is text (no audio).
*   **Mocking strategy:** A **stubbed** **`VoiceApi`** **class** returning **timed Promises** (no MSW/Apollo; no real network).
*   **Clarification flow:** **Required** (at least one scenario).
*   **Error handling:** **Required** (network-like failure and generic server-like failure).
*   **Repeat / playback:** **Not required.**
*   **Permissions:** **Microphone permission only.**
*   **Cross-platform media specifics:** Not required to vary by OS; keep it simple and working on both simulators/emulators.
*   **Metrics/latency logs:** Not required.
## UI & State requirements
### Visual states (must be obvious)
*   **Idle** — PTT button visible; last transcript(s) visible in a simple list or card.
*   **Listening** — Shown only while the user holds the button. Include a minimal animation (e.g., pulsing dot or bars).
*   **Processing** — After release; shows that the app is transcribing/thinking.
*   **Result** — Shows the returned transcript text.
*   **Error** — Shows a non-technical message and a way to try again.
### Recording UI
*   **PTT button** (hold to record; release to stop).
*   **Capture overlay/sheet** during Listening with:
    *   **Timer or subtle animation** indicating capture is live.
    *   **Cancel** button to discard the current recording and return to Idle.
### Clarification UI
*   If the API returns a clarification prompt (e.g., “What time should I set it for?”), show it as a small banner or inline card.
*   The next PTT utterance should **complete the turn** and yield a normal transcript result.
### Error UX
*   Simulate at least two cases via the stub/fixtures:
    *   **Network-like failure** (reject Promise with a “network” error)
    *   **Server-like failure** (reject with an error object containing a `code` and `message`)
*   In both cases:
    *   Return to a **safe, interactive state** (Idle).
    *   Show a user-friendly message (e.g., “Couldn’t process that. Please try again.”).
    *   Preserve any **prior** transcripts on screen.
## Audio & file behavior
*   Request **microphone permission** just-in-time on first use; handle denial gracefully (explain and provide a retry path).
*   Use Expo-friendly recording (e.g., `expo-av`) to capture audio while the button is held.
*   On release, **stop and save** the recording to a temporary local file (e.g., `FileSystem.cacheDirectory`).
*   Clean up obviously stale temp files on app start or after successful processing (basic hygiene; don’t over-engineer).
# The mocked API (stubbed class)
## Interface (you can adjust names, but keep the intent)

```typescript
// types.ts
export type ProcessVoiceInput = {
  audioUri: string;     // local file path of the recorded audio
  mimeType: string;     // e.g., "audio/m4a" or similar
  clientTs: string;     // ISO date string from client
  context?: Record<string, unknown>; // optional, for clarification
};

export type ProcessVoiceResult =
  | {
      kind: "ok";
      transcript: string;
    }
  | {
      kind: "clarification";
      prompt: string; // e.g., "What time should I set it for?"
    };

export type ProcessVoiceError = {
  kind: "error";
  code: "NETWORK" | "SERVER";
  message: string; // user-readable
};

// VoiceApi.ts
export interface VoiceApi {
  processVoice(input: ProcessVoiceInput): Promise<ProcessVoiceResult>;
}

export class StubVoiceApi implements VoiceApi {
  constructor(private opts?: { delayMs?: number; scenario?: "success" | "clarify" | "networkError" | "serverError" }) {}

  async processVoice(input: ProcessVoiceInput): Promise<ProcessVoiceResult> {
    const delay = this.opts?.delayMs ?? 1000;
    await new Promise((r) => setTimeout(r, delay));

    switch (this.opts?.scenario) {
      case "clarify":
        return { kind: "clarification", prompt: "What time should I set it for?" };
      case "networkError":
        throw { kind: "error", code: "NETWORK", message: "Network error. Please try again." };
      case "serverError":
        throw { kind: "error", code: "SERVER", message: "Something went wrong. Please try again." };
      case "success":
      default:
        return { kind: "ok", transcript: "Added ‘milk’ to your shopping list." };
    }
  }
}
```

## Scenario switching
*   Provide a simple way to switch scenarios **at runtime** (e.g., a small developer toggle in the UI or a segmented control):
    *   **Success** (returns `kind: "ok"` with a transcript)
    *   **Clarification** (returns `kind: "clarification"`; the very next PTT call should then return a normal success—your choice how you implement that)
    *   **Network error**
    *   **Server error**
> The app should behave identically regardless of scenario: same states, clear messages, never crashes.
# Technical requirements
*   **Stack:** Expo (managed) + React Native + TypeScript.
*   **Recording:** `expo-av` or equivalent Expo-compatible API.
*   **State management:** Zustand—keep it simple and clear.
*   **Structure:** Separate concerns into at least:
    *   `AudioService` (start/stop, permissions, file cleanup)
    *   `VoiceApi` (the stub above)
    *   UI components (PTT button, overlay, transcript list, error/clarification banners)
*   **No secrets** or external services; everything runs locally.
*   **Accessibility:** Buttons should be labeled (`accessibilityLabel`) and large enough to press in the simulator.
---

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

- **Node.js** (v18 or higher)
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
   git clone <repository-url>
   cd <repository-name>
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
- The app will reload automatically on code changes

### Run on Android Emulator

**Option 1: From Expo DevTools**
- Start your Android emulator first (via Android Studio AVD Manager)
- Press `a` in the terminal
- Or click "Run on Android device/emulator" in the browser

**Option 2: Direct command**
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

1. **Login to EAS**:
   ```bash
   eas login
   ```

2. **Configure Project** (first time only):
   ```bash
   eas build:configure
   ```
   This generates a project ID and links your app to your Expo account.

3. **Build for Development**:
   ```bash
   # iOS Simulator
   npm run build:dev:ios
   
   # Android APK
   npm run build:dev:android
   ```

4. **Build for Production**:
   ```bash
   # iOS App Store
   npm run build:prod:ios
   
   # Google Play Store
   npm run build:prod:android
   
   # Both platforms
   npm run build:all
   ```

### Build Profiles

- **development**: Simulator/emulator builds for testing
- **preview**: Internal testing on physical devices
- **production**: App store submission builds

### What You Need

- **Free Tier**: 30 builds/month (sufficient for this project)
- **iOS Production**: Apple Developer account ($99/year)
- **Android Production**: Google Play Console ($25 one-time)

### Detailed Guide

For complete EAS setup instructions, credentials management, and troubleshooting, see:

📖 **[EAS_SETUP.md](./EAS_SETUP.md)**

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
- **CaptureOverlay**: Full-screen modal during recording with timer and cancel
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

- **iOS**: `~/Library/Caches/<app-bundle-id>/recordings/`
- **Android**: `/data/data/<package-name>/cache/recordings/`

### File Format

- **Format**: M4A (MPEG-4 Audio)
- **Encoding**: AAC (Advanced Audio Coding)
- **Quality**: High quality, optimized for voice
- **MIME Type**: `audio/m4a` (iOS) or `audio/mp4` (Android)

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
- **On Success**: File deleted after successful API response
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

// Immediate cleanup after processing
const processRecording = async (audioUri: string) => {
  try {
    const result = await VoiceAPI.processVoice({ audioUri, ... });
    await AudioService.deleteFile(audioUri); // Clean up immediately
    return result;
  } catch (error) {
    await AudioService.deleteFile(audioUri); // Clean up on error too
    throw error;
  }
};
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
- Settings → Apps → [App Name] → Permissions → Microphone → Allow
- Or reinstall the app

**Physical Device:**
- iOS: Settings → Privacy → Microphone → [App Name]
- Android: Settings → Apps → [App Name] → Permissions

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

### Getting Help

If you encounter issues not covered here:

1. **Check Console Logs**: Look for error messages in terminal and browser DevTools
2. **React DevTools**: Inspect component state and props
3. **Expo Diagnostics**: Run `npx expo-doctor` to check for common issues
4. **Clean Slate**: Try `npx expo start -c` to clear all caches

### Performance Tips

- **Slow Simulator**: Use a newer device model (iPhone 14+, Pixel 5+)
- **Hot Reload Issues**: Disable Fast Refresh temporarily if experiencing issues
- **Memory Issues**: Close other apps and restart simulator/emulator