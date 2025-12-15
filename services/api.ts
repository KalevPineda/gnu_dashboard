import { API_BASE_URL } from "../constants";
import { AlertRecord, EvolutionPoint, LiveStatus, RemoteConfig, ThermalFrameData, DataFile } from "../types";

/**
 * Realiza una petición HTTP directa a la API.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`Error del Servidor: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error de conexión con ${url}:`, error);
    throw error;
  }
}

// Simulador de datos de matriz actualizado a 256x192
const mockMatrixGenerator = (frameId: number, baseTemp: number): ThermalFrameData => {
  const width = 256;
  const height = 192;
  const pixels = new Array(width * height); // Pre-allocate for performance
  let max = 0;
  let min = 1000;

  // Optimización: Generación de datos simulados
  const centerX = width/2 + Math.sin(frameId * 0.1) * (width/4);
  const centerY = height/2 + Math.cos(frameId * 0.1) * (height/4);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      const noise = Math.random() * 1.5;
      // Formula de calor simulada
      const heat = baseTemp + (Math.max(0, 40 - dist) * 1.5) + noise;
      
      pixels[idx] = heat;
      if (heat > max) max = heat;
      if (heat < min) min = heat;
    }
  }
  return { frame_index: frameId, width, height, pixels, max_temp: max, min_temp: min };
};

export const api = {
  getLiveStatus: () => request<LiveStatus>('/live'),
  
  getConfig: () => request<RemoteConfig>('/config'),
  
  updateConfig: (config: RemoteConfig) => request<string>('/config', { 
    method: 'POST', 
    body: JSON.stringify(config) 
  }),
  
  getAlerts: () => request<AlertRecord[]>('/alerts'),
  
  getEvolutionData: (filename: string) => request<EvolutionPoint[]>(`/evolution/${filename}`),

  // Nuevo: Obtener matriz térmica de un frame específico
  getThermalMatrix: async (datasetId: string, frameIndex: number): Promise<ThermalFrameData> => {
    try {
      return await request<ThermalFrameData>(`/matrix/${datasetId}/${frameIndex}`);
    } catch (e) {
      console.warn("API de matriz falló, usando generador local 256x192");
      return mockMatrixGenerator(frameIndex, 25);
    }
  },

  getFiles: async (): Promise<DataFile[]> => {
     try {
       return await request<DataFile[]>('/files');
     } catch (e) {
       return [
         { name: 'capture_20231024_1001.npz', size_kb: 450, date: '2023-10-24 10:01', type: 'capture' },
         { name: 'capture_20231024_1145.npz', size_kb: 480, date: '2023-10-24 11:45', type: 'capture' },
         { name: 'system_log_current.txt', size_kb: 12, date: '2023-10-24 12:00', type: 'log' },
       ];
     }
  }
};