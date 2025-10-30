export interface AudioRecording {
  uri: string;
  duration: number;
  mimeType: string;
}

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface PermissionState {
  status: PermissionStatus;
  canAskAgain: boolean;
}

export interface AudioService {
  // Permission management
  checkPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  
  // Recording lifecycle
  startRecording(): Promise<void>;
  stopRecording(): Promise<AudioRecording>;
  cancelRecording(): Promise<void>;
  
  // File management
  cleanupOldFiles(): Promise<void>;
  deleteFile(uri: string): Promise<void>;
  
  // State
  isRecording(): boolean;
  getRecordingDuration(): number;
}
