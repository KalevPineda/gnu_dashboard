import React, { useEffect, useState } from 'react';
import { Download, FileText, Database, Search, AlertCircle } from 'lucide-react';
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

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Archivos y Exportación</h1>
        <p className="text-slate-400 text-sm mt-1">Descarga directa de capturas alojadas en Cloud Storage</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden min-h-[400px]">
          
          {files.length === 0 && !loading && (
             <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <AlertCircle className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-slate-300 font-medium text-lg">Almacenamiento Vacío</h3>
                <p className="text-slate-500 mt-2 max-w-md">
                   No se han encontrado archivos en el directorio del servidor.
                   Verifique que el robot esté enviando datos correctamente.
                </p>
             </div>
          )}

          {files.length > 0 && (
             <>
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
                      Total: {filteredFiles.length} archivos
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-medium">
                          <tr>
                              <th className="px-6 py-4">Nombre de Archivo</th>
                              <th className="px-6 py-4">Fecha Modificación</th>
                              <th className="px-6 py-4">Tamaño</th>
                              <th className="px-6 py-4 text-right">Descargar</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                          {loading ? (
                              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Leyendo directorio...</td></tr>
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
                                              {/* 
                                                MEJORA UX: Usamos <a> con href directo al archivo estático.
                                                target="_blank" abre nueva pestaña, 'download' sugiere al navegador guardar.
                                              */}
                                              <a 
                                                href={api.getDownloadUrl(file.name)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={file.name}
                                                className="flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 hover:text-white transition-colors text-xs font-medium cursor-pointer"
                                              >
                                                  <Download className="w-3 h-3 mr-2" />
                                                  .NPZ
                                              </a>
                                          </div>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
             </>
          )}
      </div>
    </div>
  );
};