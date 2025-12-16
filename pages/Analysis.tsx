import React, { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, FileText, BarChart2, Grid, Box, Cpu, Sparkles, Maximize2 } from 'lucide-react';
import { AlertRecord, EvolutionPoint, ThermalFrameData } from '../types';
import { api } from '../services/api';
import { GoogleGenAI } from "@google/genai";

export const Analysis: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null);
  const [evolutionData, setEvolutionData] = useState<EvolutionPoint[]>([]);
  
  // Matrix State
  const [viewMode, setViewMode] = useState<'overview' | '2d' | '3d' | 'ai'>('overview');
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [matrixData, setMatrixData] = useState<ThermalFrameData | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const canvas3DRef = useRef<HTMLCanvasElement>(null);

  // Gemini State
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Loading States
  const [loadingList, setLoadingList] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Initial Load
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoadingList(true);
      try {
        const data = await api.getAlerts();
        setAlerts(data);
        if (data.length > 0) {
          handleSelectAlert(data[0]);
        }
      } catch (e) {
        console.error("Error fetching alerts", e);
      }
      setLoadingList(false);
    };
    fetchAlerts();
  }, []);

  // Update Matrix Data when Slider Moves
  useEffect(() => {
    if (selectedAlert && (viewMode === '2d' || viewMode === '3d' || viewMode === 'ai')) {
      const fetchMatrix = async () => {
        setMatrixError(null);
        try {
          // NOTA: La API Rust actual probablemente falle aquí porque no tiene endpoint /matrix
          const data = await api.getThermalMatrix(selectedAlert.dataset_path, currentFrameIndex);
          setMatrixData(data);
        } catch (e) {
          setMatrixData(null);
          setMatrixError("El backend actual no soporta la visualización detallada de la matriz (falta endpoint /matrix).");
        }
      };
      fetchMatrix();
    }
  }, [currentFrameIndex, viewMode, selectedAlert]);

  // Draw 2D Heatmap
  useEffect(() => {
    if (viewMode === '2d' && matrixData && canvas2DRef.current) {
      const ctx = canvas2DRef.current.getContext('2d');
      if (ctx) {
        const { width, height, pixels, min_temp, max_temp } = matrixData;
        canvas2DRef.current.width = width;
        canvas2DRef.current.height = height;

        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;
        const range = max_temp - min_temp || 1;

        for (let i = 0; i < pixels.length; i++) {
            const val = pixels[i];
            const norm = (val - min_temp) / range;
            let r, g, b;
            r = Math.min(255, Math.max(0, norm * 255 * 2));
            g = Math.min(255, Math.max(0, (norm - 0.5) * 255 * 2));
            b = Math.min(255, Math.max(0, (1 - norm) * 255));

            const idx = i * 4;
            data[idx] = r;     
            data[idx + 1] = g; 
            data[idx + 2] = b; 
            data[idx + 3] = 255; 
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }
  }, [matrixData, viewMode]);

  // Draw 3D Wireframe
  useEffect(() => {
    if (viewMode === '3d' && matrixData && canvas3DRef.current) {
      const ctx = canvas3DRef.current.getContext('2d');
      if (ctx) {
        const { width, height, pixels, min_temp, max_temp } = matrixData;
        const w = canvas3DRef.current.width;
        const h = canvas3DRef.current.height;
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1;
        const range = max_temp - min_temp || 1;
        const stepX = Math.ceil(width / 32); 
        const stepY = Math.ceil(height / 24);
        const spacingX = w / (width / stepX * 1.5);
        const spacingY = h / (height / stepY * 2);
        const offsetX = w / 4;
        const offsetY = h / 3;

        for (let y = 0; y < height; y += stepY) {
          ctx.beginPath();
          for (let x = 0; x < width; x += stepX) {
            const val = pixels[y * width + x];
            const norm = (val - min_temp) / range;
            const lift = norm * 60;
            const visualX = x / stepX;
            const visualY = y / stepY;
            const isoX = offsetX + (visualX - visualY) * spacingX + (w/3);
            const isoY = offsetY + (visualX + visualY) * (spacingY * 0.5) - lift;

            if (x === 0) ctx.moveTo(isoX, isoY);
            else ctx.lineTo(isoX, isoY);
          }
          ctx.stroke();
        }
        
        for (let x = 0; x < width; x += stepX) {
           ctx.beginPath();
           for (let y = 0; y < height; y += stepY) {
             const val = pixels[y * width + x];
             const norm = (val - min_temp) / range;
             const lift = norm * 60;
             const visualX = x / stepX;
             const visualY = y / stepY;
             const isoX = offsetX + (visualX - visualY) * spacingX + (w/3);
             const isoY = offsetY + (visualX + visualY) * (spacingY * 0.5) - lift;
             
             if (y === 0) ctx.moveTo(isoX, isoY);
             else ctx.lineTo(isoX, isoY);
           }
           ctx.stroke();
        }
      }
    }
  }, [matrixData, viewMode]);

  const handleSelectAlert = async (alert: AlertRecord) => {
    setSelectedAlert(alert);
    setViewMode('overview');
    setAiAnalysis("");
    setCurrentFrameIndex(0);
    setLoadingData(true);
    setMatrixData(null);
    setMatrixError(null);
    try {
      const data = await api.getEvolutionData(alert.dataset_path);
      setEvolutionData(data);
    } catch(e) {
      console.error(e);
      setEvolutionData([]);
    }
    setLoadingData(false);
  };

  const runGeminiAnalysis = async () => {
    if (!process.env.API_KEY) {
        setAiAnalysis("Error: API Key no configurada.");
        return;
    }
    
    // Si no tenemos datos de matriz, usamos los metadatos de la alerta
    const hasMatrix = !!matrixData;
    const promptContext = hasMatrix 
      ? `Temperatura Máxima: ${matrixData!.max_temp.toFixed(1)}°C, Diferencial: ${(matrixData!.max_temp - matrixData!.min_temp).toFixed(1)}°C`
      : `Temperatura Máxima Registrada: ${selectedAlert?.max_temp.toFixed(1)}°C (Datos detallados de matriz no disponibles)`;

    setIsAnalyzing(true);
    setAiAnalysis("");

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = ai.models.generateContent;
        
        const prompt = `Actúa como un ingeniero experto en análisis térmico industrial. Analiza el siguiente incidente de turbina:
        - ${promptContext}
        - ID Turbina: ${selectedAlert?.turbine_token}
        - Ángulo: ${selectedAlert?.angle}°
        
        Provee un diagnóstico breve (máx 3 líneas) sobre la posible causa del sobrecalentamiento y recomendación inmediata.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        setAiAnalysis(response.text || "No se pudo generar análisis.");

    } catch (error) {
        console.error(error);
        setAiAnalysis("Error conectando con Gemini AI Service.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-white">Análisis Térmico Avanzado</h1>
           <p className="text-slate-400 text-sm mt-1">Revisión de anomalías e insights de IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left: Alert List */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/30">
            <h2 className="font-semibold text-slate-200 flex items-center text-sm">
              <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
              Incidentes Recientes
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-4 text-center text-slate-500 text-xs">Cargando alertas...</div>
            ) : alerts.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">No hay alertas registradas</div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {alerts.map((alert) => (
                  <li 
                    key={alert.id}
                    onClick={() => handleSelectAlert(alert)}
                    className={`p-3 cursor-pointer hover:bg-slate-800 transition-colors ${selectedAlert?.id === alert.id ? 'bg-slate-800/60 border-l-2 border-orange-500' : 'border-l-2 border-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-slate-400">{new Date(alert.timestamp * 1000).toLocaleDateString()}</span>
                      <span className="text-xs font-bold text-red-400">{alert.max_temp.toFixed(1)}°C</span>
                    </div>
                    <p className="text-xs font-medium text-slate-200 mb-1 truncate">{alert.turbine_token}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
           {selectedAlert ? (
             <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden relative">
                
                {/* Toolbar */}
                <div className="h-14 border-b border-slate-800 flex items-center px-4 space-x-2 bg-slate-800/20">
                    <button onClick={() => setViewMode('overview')} className={`p-2 rounded hover:bg-slate-700 ${viewMode === 'overview' ? 'bg-slate-700 text-orange-400' : 'text-slate-400'}`} title="Resumen Temporal">
                        <BarChart2 className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-slate-700 mx-2"></div>
                    <button onClick={() => setViewMode('2d')} className={`p-2 rounded hover:bg-slate-700 ${viewMode === '2d' ? 'bg-slate-700 text-blue-400' : 'text-slate-400'}`} title="Matriz 2D">
                        <Grid className="w-5 h-5" />
                    </button>
                    <button onClick={() => setViewMode('3d')} className={`p-2 rounded hover:bg-slate-700 ${viewMode === '3d' ? 'bg-slate-700 text-purple-400' : 'text-slate-400'}`} title="Superficie 3D">
                        <Box className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-slate-700 mx-2"></div>
                    <button onClick={() => setViewMode('ai')} className={`p-2 rounded hover:bg-slate-700 ${viewMode === 'ai' ? 'bg-slate-700 text-green-400' : 'text-slate-400'}`} title="Análisis AI">
                        <Sparkles className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-4 relative flex items-center justify-center bg-black/20">
                    
                    {/* Error Message for missing Matrix Data */}
                    {(viewMode === '2d' || viewMode === '3d') && matrixError && (
                        <div className="text-center p-6 bg-slate-800/50 rounded-lg max-w-md">
                           <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                           <p className="text-slate-300 font-medium mb-1">Visualización no disponible</p>
                           <p className="text-slate-500 text-sm">{matrixError}</p>
                        </div>
                    )}

                    {/* View: Overview */}
                    {viewMode === 'overview' && (
                        <div className="w-full h-full">
                           <h4 className="text-xs font-mono text-slate-500 absolute top-2 right-2">Resumen de Archivo</h4>
                           <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={evolutionData}>
                              <defs>
                                <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis dataKey="frame_index" stroke="#94a3b8" />
                              <YAxis stroke="#94a3b8" unit="°C" domain={['auto', 'auto']} />
                              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                              <Area type="monotone" dataKey="max_temp" stroke="#ef4444" fill="url(#colorMax)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                    )}

                    {/* View: 2D Matrix */}
                    {viewMode === '2d' && !matrixError && matrixData && (
                        <div className="flex flex-col items-center w-full h-full justify-center">
                            <canvas 
                                ref={canvas2DRef} 
                                className="border border-slate-700 bg-black rounded shadow-2xl image-pixelated max-w-full max-h-full"
                                style={{ aspectRatio: matrixData ? `${matrixData.width}/${matrixData.height}` : '4/3' }}
                            ></canvas>
                        </div>
                    )}

                    {/* View: 3D Matrix */}
                    {viewMode === '3d' && !matrixError && matrixData && (
                         <div className="flex flex-col items-center">
                             <canvas ref={canvas3DRef} width={400} height={300} className="border border-slate-700 bg-slate-900 rounded shadow-2xl"></canvas>
                         </div>
                    )}

                    {/* View: AI */}
                    {viewMode === 'ai' && (
                        <div className="w-full max-w-md p-6 bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
                            <div className="flex items-center mb-4">
                                <Cpu className="w-8 h-8 text-green-400 mr-3" />
                                <h3 className="text-xl font-bold text-white">Gemini Insight</h3>
                            </div>
                            
                            <div className="mb-6 space-y-2">
                                <div className="flex justify-between text-sm text-slate-300 border-b border-slate-700 pb-1">
                                    <span>Pico Térmico:</span> <span className="font-mono text-red-400">{selectedAlert.max_temp.toFixed(1)} °C</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-300 border-b border-slate-700 pb-1">
                                    <span>Archivo:</span> <span className="font-mono text-orange-400 truncate max-w-[150px]">{selectedAlert.dataset_path}</span>
                                </div>
                            </div>

                            <button 
                                onClick={runGeminiAnalysis}
                                disabled={isAnalyzing}
                                className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex justify-center items-center"
                            >
                                {isAnalyzing ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div> : <Sparkles className="w-4 h-4 mr-2" />}
                                {isAnalyzing ? 'Analizando...' : 'Analizar Incidente'}
                            </button>

                            {aiAnalysis && (
                                <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-700 text-sm text-slate-300 leading-relaxed animate-in fade-in">
                                    {aiAnalysis}
                                </div>
                            )}
                        </div>
                    )}
                </div>
             </div>
           ) : (
             <div className="h-full bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500">
               Seleccione una alerta para comenzar
             </div>
           )}
        </div>

        {/* Right: Metadata */}
        <div className="lg:col-span-3 space-y-4">
           {selectedAlert && (
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                 <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center uppercase tracking-wide">
                   <FileText className="w-4 h-4 mr-2" />
                   Metadatos
                 </h3>
                 <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-500">ID</span>
                        <span className="text-sm text-slate-300 font-mono truncate max-w-[120px]" title={selectedAlert.id}>{selectedAlert.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Dataset</span>
                        <span className="text-sm text-slate-300 font-mono truncate max-w-[120px]" title={selectedAlert.dataset_path}>{selectedAlert.dataset_path}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Ángulo</span>
                        <span className="text-sm text-slate-300">{selectedAlert.angle.toFixed(1)}°</span>
                    </div>
                    <div className="pt-3 border-t border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">Severidad</div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-500 to-red-500" style={{ width: `${Math.min(100, (selectedAlert.max_temp / 100) * 100)}%` }}></div>
                        </div>
                    </div>
                 </div>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};