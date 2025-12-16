// Matches Rust 'RemoteConfig'
export interface RemoteConfig {
    max_temp_trigger: number;
    scan_wait_time_sec: number;
    system_enabled: boolean;
    pan_step_degrees: number; 
    alert_email?: string; 
    gemini_api_key?: string; // New: API Key stored in backend
  }
  
  // Matches Rust 'LiveStatus'
  export interface LiveStatus {
    last_update: number; // Unix Timestamp
    turbine_token: string;
    mode: string;
    current_angle: number;
    current_max_temp: number;
    is_online: boolean;
  }
  
  // Matches Rust 'AlertRecord'
  export interface AlertRecord {
    id: string;
    timestamp: number;
    turbine_token: string;
    max_temp: number;
    angle: number;
    dataset_path: string;
  }
  
  // Matches Rust 'EvolutionPoint'
  export interface EvolutionPoint {
    frame_index: number;
    max_temp: number;
    avg_temp: number;
  }
  
  // New: For Matrix Data (2D Array)
  export interface ThermalFrameData {
    frame_index: number;
    width: number;
    height: number;
    pixels: number[];
    min_temp: number;
    max_temp: number;
  }

  // Matches Rust 'FileEntry'
  export interface DataFile {
    name: string;
    size_kb: number;
    date: string;
    type: 'capture' | 'log';
  }
  
  export enum FetchState {
    IDLE,
    LOADING,
    SUCCESS,
    ERROR,
  }