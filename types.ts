// Matches Rust 'RemoteConfig'
export interface RemoteConfig {
    max_temp_trigger: number;
    scan_wait_time_sec: number;
    system_enabled: boolean;
    alert_email: string;
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
    pixels: number[]; // Flattened array or 2D array depending on API, assuming flattened for ease
    min_temp: number;
    max_temp: number;
  }

  // New: For File Management
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