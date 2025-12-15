import React, { useEffect, useState } from 'react';
import { Download, FileText, Database, FileCode, Search } from 'lucide-react';
import { api } from '../services/api';
import { DataFile } from '../types';

export const Downloads: React.FC = () => {
  const [files, setFiles] = useState<DataFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadFiles = async () => {
        try {
            const data = await api.getFiles();
            setFiles(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    loadFiles();
  }, []);

  const handleDownload = (filename: string, format: 'raw' | 'csv' | 'txt') => {
      // In a real app, this would trigger a window.location.href or fetch blob
      // Here we simulate the action
      console.log(`Downloading ${filename} as ${format}`);
      const element = document.createElement("a");
      const file = new Blob([`Simulated content for ${filename} in ${format}`], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${filename}.${format}`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Archivos y Exportación</h1>
        <p className="text-slate-400 text-sm mt-1">Descarga de datasets crudos y reportes de logs</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-800 bg-slate-800/20 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar archivo..." 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="text-xs text-slate-500">
                  Total: {files.length} archivos
              </div>
          </div>

          {/* List */}
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-medium">
                      <tr>
                          <th className="px-6 py-4">Nombre de Archivo</th>
                          <th className="px-6 py-4">Fecha</th>
                          <th className="px-6 py-4">Tamaño</th>
                          <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                      {loading ? (
                          <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Cargando catálogo...</td></tr>
                      ) : filteredFiles.length === 0 ? (
                          <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No se encontraron archivos.</td></tr>
                      ) : (
                          filteredFiles.map((file, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center">
                                          {file.type === 'capture' ? <Database className="w-4 h-4 text-orange-400 mr-3" /> : <FileText className="w-4 h-4 text-slate-400 mr-3" />}
                                          <span className="text-slate-200 text-sm font-medium">{file.name}</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-slate-400 text-sm">{file.date}</td>
                                  <td className="px-6 py-4 text-slate-400 text-sm font-mono">{file.size_kb} KB</td>
                                  <td className="px-6 py-4">
                                      <div className="flex justify-end space-x-2">
                                          <button 
                                            onClick={() => handleDownload(file.name, 'raw')}
                                            className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Descargar RAW"
                                          >
                                              <Download className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => handleDownload(file.name, 'csv')}
                                            className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400 transition-colors" title="Exportar CSV"
                                          >
                                              <FileText className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => handleDownload(file.name, 'txt')}
                                            className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors" title="Exportar TXT"
                                          >
                                              <FileCode className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};