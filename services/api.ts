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
  
  getEvolutionData: (filename: string) => request<EvolutionPoint[]>(`/evolution/${filename}`),

  getThermalMatrix: async (datasetId: string, frameIndex: number): Promise<ThermalFrameData> => {
    console.warn("La API actual no soporta streaming de matriz térmica (falta endpoint /matrix o /pixels).");
    throw new Error("Matrix Data Not Available in Backend");
  },

  /**
   * Obtiene la lista de archivos directamente del sistema de archivos del servidor.
   * Usa el endpoint GET /api/files implementado en el backend.
   */
  getFiles: async (): Promise<DataFile[]> => {
     return await request<DataFile[]>('/files');
  },
  
  /**
   * Helper para construir la URL de descarga directa
   */
  getDownloadUrl: (filename: string): string => {
    // Si API_BASE_URL es "/api", queremos "/files/archivo.npz"
    // Si API_BASE_URL es "http://host:8080/api", queremos "http://host:8080/files/archivo.npz"
    const baseUrl = API_BASE_URL.replace(/\/api$/, '');
    return `${baseUrl}/files/${filename}`;
  }
};