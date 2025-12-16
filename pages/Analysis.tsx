import React, { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Database, FileText, BarChart2, Grid, Box, Cpu, Sparkles, AlertTriangle, Search, Contrast, MousePointer2 } from 'lucide-react';
import { DataFile, EvolutionPoint, ThermalFrameData } from '../types';
import { api } from '../services/api';
import { GoogleGenAI } from "@google/genai";
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- COMPONENTE INTERNO: VISUALIZADOR 3D ---
const Thermal3DViewer: React.FC<{ data: ThermalFrameData }> = ({ data }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ temp: number, x: number, y: number } | null>(null);

  useEffect(() => {
    if (!mountRef.current || !data) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // Slate 950 matches UI

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, -data.height * 1.5, data.width); // Angled view
    camera.up.set(0, 0, 1); // Z is up

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    // 5. Geometry (Terrain)
    // PlaneGeometry segments must be (width-1) to result in (width) vertices
    const geometry = new THREE.PlaneGeometry(data.width, data.height, data.width - 1, data.height - 1);
    const count = geometry.attributes.position.count;
    
    // Arrays for Z positions and Colors
    const colors = [];
    const colorObj = new THREE.Color();
    const range = (data.max_temp - data.min_temp) || 1;
    const Z_SCALE = 0.5; // Escala de exageración de altura

    for (let i = 0; i < count; i++) {
        const temp = data.pixels[i];
        
        // Z Height calculation
        const normalizedH = (temp - data.min_temp) / range;
        const z = normalizedH * 10 * Z_SCALE;
        geometry.attributes.position.setZ(i, z);

        // Color Calculation (Blue -> Red gradient)
        // 0.0 (Blue) -> 0.33 (Cyan) -> 0.66 (Yellow) -> 1.0 (Red) implementation simplified:
        const hue = (1.0 - normalizedH) * 240 / 360; // 240 is blue, 0 is red in HSL
        colorObj.setHSL(hue, 1.0, 0.5);
        colors.push(colorObj.r, colorObj.g, colorObj.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ 
        vertexColors: true, 
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.DoubleSide,
        wireframe: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 6. Max Temp Plane (Reference)
    const maxZ = 10 * Z_SCALE;
    const planeGeo = new THREE.PlaneGeometry(data.width, data.height);
    const planeMat = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.1, 
        side: THREE.DoubleSide 
    });
    const maxPlane = new THREE.Mesh(planeGeo, planeMat);
    maxPlane.position.z = maxZ;
    scene.add(maxPlane);

    // Grid Helper at base
    const gridHelper = new THREE.GridHelper(Math.max(data.width, data.height) * 1.5, 20, 0x334155, 0x1e293b);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -1;
    scene.add(gridHelper);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 10, 20);
    scene.add(dirLight);

    // 7. Interaction (Raycaster)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const markerGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.visible = false;
    scene.add(marker);

    const onPointerMove = (event: PointerEvent) => {
        if (!mountRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(mesh);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            marker.position.copy(intersect.point);
            marker.visible = true;

            // Reverse calc temp from Z
            const z = intersect.point.z;
            const norm = z / (10 * Z_SCALE);
            const estTemp = data.min_temp + (norm * range);
            
            setHoverInfo({
                temp: estTemp,
                x: intersect.point.x,
                y: intersect.point.y
            });
        } else {
            marker.visible = false;
            setHoverInfo(null);
        }
    };
    
    // Add event listeners specific to renderer canvas
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    // Touch support for interaction is handled by OrbitControls primarily, 
    // but tapping to see value could be added similarly.

    // Animation Loop
    let animationId: number;
    const animate = () => {
        animationId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
        cancelAnimationFrame(animationId);
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        mountRef.current?.removeChild(renderer.domElement);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
    };
  }, [data]);

  return (
    <div className="relative w-full h-full group">
        <div ref={mountRef} className="w-full h-full cursor-move" />
        
        {/* Info Overlay */}
        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur p-2 rounded border border-slate-700 pointer-events-none">
            <p className="text-xs text-slate-400">Plano Rojo = Max Temp ({data.max_temp.toFixed(1)}°C)</p>
            <p className="text-xs text-slate-500 mt-1">Girar: Arrastrar | Zoom: Rueda</p>
        </div>

        {/* Dynamic Tooltip */}
        {hoverInfo && (
            <div className="absolute bottom-4 right-4 bg-slate-800/90 border border-orange-500/50 p-3 rounded-lg shadow-xl animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center space-x-2">
                    <MousePointer2 className="w-4 h-4 text-orange-400" />
                    <span className="text-lg font-bold text-white">{hoverInfo.temp.toFixed(1)}°C</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                    Coords: [{hoverInfo.x.toFixed(1)}, {hoverInfo.y.toFixed(1)}]
                </div>
            </div>
        )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export const Analysis: React.FC = () => {
  // File State
  const [files, setFiles] = useState<DataFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [evolutionData, setEvolutionData] = useState<EvolutionPoint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Matrix View State
  const [viewMode, setViewMode] = useState<'overview' | '2d' | '3d' | 'grayscale' | 'ai'>('overview');
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [matrixData, setMatrixData] = useState<ThermalFrameData | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  
  // Refs for 2D Canvases
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const canvasGrayRef = useRef<HTMLCanvasElement>(null);

  // Gemini State
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Loading States
  const [loadingList, setLoadingList] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Initial Load
  useEffect(() => {
    const initData = async () => {
      setLoadingList(true);
      try {
        const filesData = await api.getFiles();
        const captures = filesData.filter(f => f.type === 'capture');
        setFiles(captures);
        if (captures.length > 0) {
          handleSelectFile(captures[0]);
        }
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

  // Update Matrix Data
  useEffect(() => {
    if (selectedFile && (viewMode !== 'overview')) {
      const fetchMatrix = async () => {
        setMatrixError(null);
        try {
          const data = await api.getThermalMatrix(selectedFile.name, currentFrameIndex);
          setMatrixData(data);
        } catch (e) {
          setMatrixData(null);
          setMatrixError("No se pudo cargar la matriz térmica. Verifique el backend.");
        }
      };
      fetchMatrix();
    }
  }, [currentFrameIndex, viewMode, selectedFile]);

  // Draw 2D Heatmap (Color)
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
            // Heatmap: Blue -> Red
            data[idx] = Math.min(255, Math.max(0, norm * 255 * 2));     
            data[idx + 1] = Math.min(255, Math.max(0, (norm - 0.5) * 255 * 2)); 
            data[idx + 2] = Math.min(255, Math.max(0, (1 - norm) * 255)); 
            data[idx + 3] = 255; 
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }
  }, [matrixData, viewMode]);

  // Draw Grayscale Heatmap (High Contrast)
  useEffect(() => {
    if (viewMode === 'grayscale' && matrixData && canvasGrayRef.current) {
      const ctx = canvasGrayRef.current.getContext('2d');
      if (ctx) {
        const { width, height, pixels, min_temp, max_temp } = matrixData;
        canvasGrayRef.current.width = width;
        canvasGrayRef.current.height = height;
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;
        const range = max_temp - min_temp || 1;
        for (let i = 0; i < pixels.length; i++) {
            const val = pixels[i];
            const norm = (val - min_temp) / range;
            const idx = i * 4;
            // Grayscale: 0 (Black) -> 255 (White)
            const gray = Math.floor(norm * 255);
            data[idx] = gray;     // R
            data[idx + 1] = gray; // G
            data[idx + 2] = gray; // B
            data[idx + 3] = 255;  // Alpha
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
      const data = await api.getEvolutionData(file.name);
      setEvolutionData(data);
    } catch(e) {
      setEvolutionData([]);
    }
    setLoadingData(false);
  };

  const runGeminiAnalysis = async () => {
    if (!apiKey || !selectedFile) {
        setAiAnalysis("Error: API Key no configurada.");
        return;
    }
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
        Provee un resumen técnico.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        setAiAnalysis(response.text || "No se pudo generar análisis.");
    } catch (error) {
        setAiAnalysis("Error conectando con Gemini AI Service.");
    } finally {
        setIsAnalyzing(false);
    }
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
                <div className="h-14 border-b border-slate-800 flex items-center px-2 md:px-4 space-x-1 md:space-x-2 bg-slate-800/20 overflow-x-auto">
                    <button onClick={() => setViewMode('overview')} className={`p-2 rounded hover:bg-slate-700 ${viewMode === 'overview' ? 'bg-slate-700 text-orange-400' : 'text-slate-400'}`} title="Resumen Temporal">
                        <BarChart2 className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-slate-700 mx-1 md:mx-2"></div>
                    <button onClick={() => setViewMode('2d')} className={`p-2 rounded hover:bg-slate-700 ${viewMode === '2d' ? 'bg-slate-700 text-blue-400' : 'text-slate-400'}`} title="Matriz 2D Color">
                        <Grid className="w-5 h-5" />
                    </button>
                    <button onClick={() => setViewMode('grayscale')} className={`p-2 rounded hover:bg-slate-700 ${viewMode === 'grayscale' ? 'bg-slate-700 text-white' : 'text-slate-400'}`} title="Matriz Escala de Grises">
                        <Contrast className="w-5 h-5" />
                    </button>
                    <button onClick={() => setViewMode('3d')} className={`p-2 rounded hover:bg-slate-700 ${viewMode === '3d' ? 'bg-slate-700 text-purple-400' : 'text-slate-400'}`} title="Superficie 3D">
                        <Box className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-slate-700 mx-1 md:mx-2"></div>
                    <button onClick={() => setViewMode('ai')} className={`p-2 rounded hover:bg-slate-700 ${viewMode === 'ai' ? 'bg-slate-700 text-green-400' : 'text-slate-400'}`} title="Análisis AI">
                        <Sparkles className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-4 relative flex items-center justify-center bg-black/20 overflow-hidden">
                    
                    {/* Error Message */}
                    {viewMode !== 'overview' && viewMode !== 'ai' && matrixError && (
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

                    {/* View: 2D Matrix (Color) */}
                    {viewMode === '2d' && !matrixError && matrixData && (
                        <div className="flex flex-col items-center w-full h-full justify-center space-y-4">
                            <canvas 
                                ref={canvas2DRef} 
                                className="border border-slate-700 bg-black rounded shadow-2xl image-pixelated max-w-full max-h-[80%]"
                                style={{ aspectRatio: matrixData ? `${matrixData.width}/${matrixData.height}` : '4/3' }}
                            ></canvas>
                            <FrameSlider current={currentFrameIndex} max={evolutionData.length - 1} onChange={setCurrentFrameIndex} maxTemp={matrixData.max_temp} />
                        </div>
                    )}

                     {/* View: Grayscale Matrix */}
                     {viewMode === 'grayscale' && !matrixError && matrixData && (
                        <div className="flex flex-col items-center w-full h-full justify-center space-y-4">
                            <canvas 
                                ref={canvasGrayRef} 
                                className="border border-slate-700 bg-black rounded shadow-2xl image-pixelated max-w-full max-h-[80%]"
                                style={{ aspectRatio: matrixData ? `${matrixData.width}/${matrixData.height}` : '4/3' }}
                            ></canvas>
                             <div className="text-xs text-slate-500 mb-2">Blanco = Caliente | Negro = Frío</div>
                             <FrameSlider current={currentFrameIndex} max={evolutionData.length - 1} onChange={setCurrentFrameIndex} maxTemp={matrixData.max_temp} />
                        </div>
                    )}

                    {/* View: 3D Matrix */}
                    {viewMode === '3d' && !matrixError && matrixData && (
                         <div className="flex flex-col w-full h-full relative">
                            <div className="flex-1 rounded-lg overflow-hidden border border-slate-800 bg-black relative">
                                <Thermal3DViewer data={matrixData} />
                            </div>
                            <div className="mt-4 px-4">
                                <FrameSlider current={currentFrameIndex} max={evolutionData.length - 1} onChange={setCurrentFrameIndex} maxTemp={matrixData.max_temp} />
                            </div>
                         </div>
                    )}

                    {/* View: AI */}
                    {viewMode === 'ai' && (
                        <div className="w-full max-w-md p-6 bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-y-auto max-h-full">
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
                                        API Key no configurada. Por favor ve a <Link to="/settings" className="underline hover:text-white">Configuración</Link>.
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

// Helper component for slider
const FrameSlider: React.FC<{current: number, max: number, onChange: (v: number) => void, maxTemp: number}> = ({current, max, onChange, maxTemp}) => (
    <div className="w-full max-w-xs">
        <label className="text-xs text-slate-400 flex justify-between">
            <span>Frame: {current}</span>
            <span>Max: {maxTemp.toFixed(1)}°C</span>
        </label>
        <input 
            type="range" 
            min="0" 
            max={max} 
            value={current}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-2 accent-orange-500"
        />
    </div>
);