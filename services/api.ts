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

export const api = {
  getLiveStatus: () => request<LiveStatus>('/live'),
  
  getConfig: () => request<RemoteConfig>('/config'),
  
  updateConfig: (config: RemoteConfig) => request<string>('/config', { 
    method: 'POST', 
    body: JSON.stringify(config) 
  }),
  
  getAlerts: () => request<AlertRecord[]>('/alerts'),
  
  // La API Rust devuelve un vector de puntos de evolución
  getEvolutionData: (filename: string) => request<EvolutionPoint[]>(`/evolution/${filename}`),

  // NOTA: La API Rust actual NO tiene un endpoint "/matrix".
  // Eliminamos el generador falso. Esto lanzará error en la UI si se intenta usar,
  // lo cual es correcto para verificar la integración real.
  getThermalMatrix: async (datasetId: string, frameIndex: number): Promise<ThermalFrameData> => {
    // Intentamos llamar a un endpoint hipotético o lanzamos error controlado
    // para que la UI sepa que no hay datos de matriz disponibles.
    console.warn("La API actual no soporta streaming de matriz térmica (falta endpoint /matrix o /pixels).");
    throw new Error("Matrix Data Not Available in Backend");
  },

  // NOTA: La API Rust actual sirve archivos estáticos en /files pero NO tiene un endpoint 
  // que retorne un JSON con la lista de archivos. Retornamos array vacío para no romper la UI.
  getFiles: async (): Promise<DataFile[]> => {
     console.warn("La API actual no soporta listado de directorios.");
     return [];
  }
};