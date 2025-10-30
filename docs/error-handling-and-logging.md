# Error Handling and Logging

This document describes the error handling and logging implementation for the PTT Voice Capture application.

## Error Boundary

### Overview
The application is wrapped in an `ErrorBoundary` component that catches JavaScript errors anywhere in the component tree, logs those errors, and displays a fallback UI instead of crashing.

### Location
- Component: `components/error-boundary.tsx`
- Integrated in: `app/_layout.tsx` (wraps the entire app)

### Features
- **Graceful Error Recovery**: Catches unhandled errors and prevents app crashes
- **User-Friendly Fallback UI**: Shows a clear error message with a "Try Again" button
- **Development Mode Details**: In `__DEV__` mode, displays error stack traces for debugging
- **Error Logging**: Logs all caught errors with timestamps and component stack traces

### Usage
The error boundary is automatically active for the entire application. No additional setup is required.

## Logging System

### Overview
A centralized logging utility (`utils/logger.ts`) provides structured logging throughout the application with context and timestamps.

### Log Levels
- **debug**: Development-only detailed information
- **info**: General informational messages
- **warn**: Warning messages (always logged)
- **error**: Error messages with optional error objects (always logged)

### Specialized Logging Functions
- `stateTransition(from, to, context)`: Logs state machine transitions
- `userAction(action, context)`: Logs user interactions
- `performance(operation, durationMs, context)`: Logs performance metrics

### Integration Points

#### 1. App Lifecycle (`app/_layout.tsx`)
- App initialization
- Audio mode setup
- File cleanup operations
- App state changes (foreground/background)

#### 2. Voice Store (`store/voice-store.ts`)
- State transitions (idle → listening → processing → result/error)
- User actions (start recording, stop recording, cancel, dismiss errors)
- API interactions
- Performance metrics for recording flows

#### 3. Audio Service (`services/audio/audio-service.ts`)
- Permission checks and requests
- Recording lifecycle (start, stop, cancel)
- File operations (create, delete, cleanup)
- Performance metrics for audio operations

#### 4. Voice API (`services/voice-api/stub-voice-api.ts`)
- API scenario changes
- Voice processing requests
- API responses (success, clarification, errors)
- Performance metrics for API calls

#### 5. Main Screen (`app/(tabs)/index.tsx`)
- Screen lifecycle (mount, unmount)
- User interactions (open settings)

## Error Recovery Strategies

### Permission Errors
- Show explanation modal with clear message
- Provide "Open Settings" button
- Provide "Try Again" button to re-request permission
- Never block the UI permanently

### Recording Errors
- Log error to console
- Show generic error message to user
- Return to idle state
- Preserve previous transcripts

### API Errors
- Catch all promise rejections
- Map error codes to user-friendly messages
- Show error banner with dismiss option
- Return to idle state
- Preserve previous transcripts
- Enable immediate retry

### File System Errors
- Log error to console
- Continue operation if possible
- Show error only if critical

## Development vs Production

### Development Mode (`__DEV__ === true`)
- All log levels are active (debug, info, warn, error)
- Error boundary shows detailed error information
- Console logs include full context and stack traces

### Production Mode (`__DEV__ === false`)
- Only warn and error logs are active
- Error boundary shows user-friendly message only
- Logs could be sent to external logging service (not implemented)

## Best Practices

1. **Always log state transitions** for debugging state machine issues
2. **Log user actions** to understand user behavior and reproduce issues
3. **Include context** in log messages for better debugging
4. **Use performance logging** for operations that might be slow
5. **Catch and log all errors** but continue gracefully when possible
6. **Provide clear error messages** to users without technical jargon

## Future Enhancements

- Integration with error reporting service (e.g., Sentry)
- Remote logging for production issues
- Log filtering and search capabilities
- Performance monitoring and alerting
