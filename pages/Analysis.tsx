import React, { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Database, FileText, BarChart2, Grid, Box, Cpu, Sparkles, AlertTriangle, Search } from 'lucide-react';
import { DataFile, EvolutionPoint, ThermalFrameData } from '../types';
import { api } from '../services/api';
import { GoogleGenAI } from "@google/genai";
import { Link } from 'react-router-dom';

export const Analysis: React.FC = () => {
  // File State
  const [files, setFiles] = useState<DataFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [evolutionData, setEvolutionData] = useState<EvolutionPoint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Matrix View State
  const [viewMode, setViewMode] = useState<'overview' | '2d' | '3d' | 'ai'>('overview');
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [matrixData, setMatrixData] = useState<ThermalFrameData | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const canvas3DRef = useRef<HTMLCanvasElement>(null);

  // Gemini State
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Loading States
  const [loadingList, setLoadingList] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Initial Load: Files instead of Alerts & Config for API Key
  useEffect(() => {
    const initData = async () => {
      setLoadingList(true);
      try {
        // 1. Fetch Files
        const filesData = await api.getFiles();
        const captures = filesData.filter(f => f.type === 'capture');
        setFiles(captures);
        if (captures.length > 0) {
          handleSelectFile(captures[0]);
        }

        // 2. Fetch Config for Gemini Key
        const configData = await api.getConfig();
        if (configData.gemini_api_key) {
          setApiKey(configData.gemini_api_key);
        }
      } catch (e) {
        console.error("Error fetching init data", e);
      }
      setLoadingList(false);
    };
    initData();
  }, []);

  // Update Matrix Data when Slider Moves or File Changes
  useEffect(() => {
    if (selectedFile && (viewMode === '2d' || viewMode === '3d' || viewMode === 'ai')) {
      const fetchMatrix = async () => {
        setMatrixError(null);
        try {
          const data = await api.getThermalMatrix(selectedFile.name, currentFrameIndex);
          setMatrixData(data);
        } catch (e) {
          setMatrixData(null);
          setMatrixError("Error cargando matriz térmica. Verifica que el backend tenga el endpoint /matrix implementado.");
        }
      };
      fetchMatrix();
    }
  }, [currentFrameIndex, viewMode, selectedFile]);

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
            const idx = i * 4;
            // Simple thermal map: Blue -> Red
            data[idx] = Math.min(255, Math.max(0, norm * 255 * 2));     
            data[idx + 1] = Math.min(255, Math.max(0, (norm - 0.5) * 255 * 2)); 
            data[idx + 2] = Math.min(255, Math.max(0, (1 - norm) * 255)); 
            data[idx + 3] = 255; 
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }
  }, [matrixData, viewMode]);

  const handleSelectFile = async (file: DataFile) => {
    setSelectedFile(file);
    setViewMode('overview');
    setAiAnalysis("");
    setCurrentFrameIndex(0);
    setLoadingData(true);
    setMatrixData(null);
    setMatrixError(null);
    try {
      // Obtenemos la evolución real del archivo seleccionado
      const data = await api.getEvolutionData(file.name);
      setEvolutionData(data);
    } catch(e) {
      console.error(e);
      setEvolutionData([]);
    }
    setLoadingData(false);
  };

  const runGeminiAnalysis = async () => {
    if (!apiKey || !selectedFile) {
        setAiAnalysis("Error: API Key no configurada.");
        return;
    }
    
    // Calcular estadísticas básicas del archivo actual usando evolutionData
    const maxTemp = evolutionData.reduce((acc, curr) => Math.max(acc, curr.max_temp), 0);
    const avgTemp = evolutionData.length > 0 
        ? evolutionData.reduce((acc, curr) => acc + curr.avg_temp, 0) / evolutionData.length 
        : 0;

    const promptContext = `
      Archivo: ${selectedFile.name}
      Temperatura Máxima en Dataset: ${maxTemp.toFixed(1)}°C
      Temperatura Promedio: ${avgTemp.toFixed(1)}°C
      Fecha Captura: ${selectedFile.date}
    `;

    setIsAnalyzing(true);
    setAiAnalysis("");

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        const prompt = `Actúa como un ingeniero experto en análisis térmico.
        Analiza los siguientes datos de una captura térmica de turbina:
        ${promptContext}
        
        Si la temperatura supera los 50°C, considéralo una anomalía potencial.
        Provee un resumen técnico, indicando si los valores son nominales o críticos, y sugiere acciones.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        setAiAnalysis(response.text || "No se pudo generar análisis.");

    } catch (error) {
        console.error(error);
        setAiAnalysis("Error conectando con Gemini AI Service. Verifica tu cuota o la API Key en Configuración.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // Helper para extraer "token" del nombre del archivo
  const getTurbineToken = (filename: string) => {
      const parts = filename.split('_');
      if (parts.length >= 2) return parts[1];
      return "Desconocido";
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-white">Análisis de Capturas</h1>
           <p className="text-slate-400 text-sm mt-1">Exploración profunda de archivos almacenados en la nube</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left: Files List */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/30 space-y-3">
            <h2 className="font-semibold text-slate-200 flex items-center text-sm">
              <Database className="w-4 h-4 mr-2 text-orange-500" />
              Capturas Disponibles
            </h2>
            <div className="relative">
                <Search className="absolute left-2 top-2 w-3 h-3 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Filtrar..." 
                    className="w-full bg-slate-950 border border-slate-700 rounded py-1 pl-7 pr-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-4 text-center text-slate-500 text-xs">Cargando archivos...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">No hay capturas disponibles</div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {filteredFiles.map((file) => (
                  <li 
                    key={file.name}
                    onClick={() => handleSelectFile(file)}
                    className={`p-3 cursor-pointer hover:bg-slate-800 transition-colors ${selectedFile?.name === file.name ? 'bg-slate-800/60 border-l-2 border-orange-500' : 'border-l-2 border-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-slate-400">{file.date.split(' ')[0]}</span>
                      <span className="text-[10px] text-slate-500">{file.size_kb} KB</span>
                    </div>
                    <p className="text-xs font-medium text-slate-200 mb-1 truncate" title={file.name}>
                        {file.name}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
           {selectedFile ? (
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
                    <button onClick={() => setViewMode('3d')} className={`p-2 rounded hover:bg-slate-700 ${viewMode === '3d' ? 'bg-slate-700 text-purple-400' : 'text-slate-400'}`} title="Superficie 3D (WIP)">
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
                           <h4 className="text-xs font-mono text-slate-500 absolute top-2 right-2">Evolución Térmica del Dataset</h4>
                           {evolutionData.length > 0 ? (
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
                           ) : (
                               <div className="flex items-center justify-center h-full text-slate-500">
                                   {loadingData ? "Cargando datos..." : "No hay datos de evolución disponibles"}
                               </div>
                           )}
                           
                        </div>
                    )}

                    {/* View: 2D Matrix */}
                    {viewMode === '2d' && !matrixError && matrixData && (
                        <div className="flex flex-col items-center w-full h-full justify-center space-y-4">
                            <canvas 
                                ref={canvas2DRef} 
                                className="border border-slate-700 bg-black rounded shadow-2xl image-pixelated max-w-full max-h-[80%]"
                                style={{ aspectRatio: matrixData ? `${matrixData.width}/${matrixData.height}` : '4/3' }}
                            ></canvas>
                            <div className="w-full max-w-xs">
                                <label className="text-xs text-slate-400 flex justify-between">
                                  <span>Frame: {currentFrameIndex}</span>
                                  <span>Max: {matrixData.max_temp.toFixed(1)}°C</span>
                                </label>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max={evolutionData.length > 0 ? evolutionData.length - 1 : 0} 
                                  value={currentFrameIndex}
                                  onChange={(e) => setCurrentFrameIndex(parseInt(e.target.value))}
                                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-2"
                                />
                            </div>
                        </div>
                    )}

                    {/* View: 3D Matrix */}
                    {viewMode === '3d' && (
                         <div className="flex flex-col items-center justify-center h-full text-slate-500">
                             <Box className="w-12 h-12 mb-2 opacity-50" />
                             <p>Visualización 3D en construcción</p>
                             <p className="text-xs mt-2">Implementar WebGL/Three.js usando datos de /api/matrix</p>
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
                                    <span>Archivo:</span> <span className="font-mono text-orange-400 truncate max-w-[150px]">{selectedFile.name}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-300 border-b border-slate-700 pb-1">
                                    <span>Fecha:</span> <span className="font-mono text-slate-400">{selectedFile.date}</span>
                                </div>
                            </div>

                            {!apiKey && (
                                <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded text-xs text-yellow-200 flex items-start">
                                    <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                                    <div>
                                        API Key no configurada. Por favor ve a <Link to="/settings" className="underline hover:text-white">Configuración</Link> para añadir tu Gemini API Key.
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={runGeminiAnalysis}
                                disabled={isAnalyzing || !apiKey}
                                className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex justify-center items-center"
                            >
                                {isAnalyzing ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div> : <Sparkles className="w-4 h-4 mr-2" />}
                                {isAnalyzing ? 'Analizando...' : 'Analizar Captura'}
                            </button>

                            {aiAnalysis && (
                                <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-700 text-sm text-slate-300 leading-relaxed animate-in fade-in max-h-64 overflow-y-auto">
                                    {aiAnalysis}
                                </div>
                            )}
                        </div>
                    )}
                </div>
             </div>
           ) : (
             <div className="h-full bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500">
               Seleccione un archivo del panel izquierdo
             </div>
           )}
        </div>

        {/* Right: Metadata */}
        <div className="lg:col-span-3 space-y-4">
           {selectedFile && (
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                 <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center uppercase tracking-wide">
                   <FileText className="w-4 h-4 mr-2" />
                   Metadatos del Archivo
                 </h3>
                 <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Token Turbina</span>
                        <span className="text-sm text-slate-300 font-mono truncate max-w-[120px]">{getTurbineToken(selectedFile.name)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Nombre</span>
                        <span className="text-sm text-slate-300 font-mono truncate max-w-[120px]" title={selectedFile.name}>{selectedFile.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Tamaño</span>
                        <span className="text-sm text-slate-300">{selectedFile.size_kb} KB</span>
                    </div>
                    
                    {evolutionData.length > 0 && (
                        <div className="pt-3 border-t border-slate-800 mt-2">
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-slate-500">Temp. Máxima Detectada</span>
                                <span className="text-xs text-red-400 font-bold">
                                    {Math.max(...evolutionData.map(d => d.max_temp)).toFixed(1)}°C
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-red-500" 
                                    style={{ width: `${Math.min(100, (Math.max(...evolutionData.map(d => d.max_temp)) / 100) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                 </div>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};