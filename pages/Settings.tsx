import React, { useEffect, useState } from 'react';
import { Save, Sliders, Power, RefreshCw, AlertCircle, Gauge } from 'lucide-react';
import { api } from '../services/api';
import { RemoteConfig } from '../types';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<RemoteConfig>({
    max_temp_trigger: 0,
    scan_wait_time_sec: 0,
    system_enabled: false,
    pan_step_degrees: 0.5, // Default
    alert_email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getConfig();
      setConfig(data);
    } catch (e) {
      setMsg({ type: 'error', text: 'No se pudo cargar la configuración del servidor.' });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.updateConfig(config);
      setMsg({ type: 'success', text: 'Configuración actualizada exitosamente en el Core.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Error al actualizar la configuración.' });
    }
    setSaving(false);
  };

  const handleToggle = () => {
    setConfig(prev => ({ ...prev, system_enabled: !prev.system_enabled }));
  };

  if (loading) {
    return <div className="text-slate-400 p-8">Cargando configuración...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración del Sistema</h1>
        <p className="text-slate-400 text-sm mt-1">Gestión de comportamiento del robot y umbrales de seguridad</p>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-8">
        
        {/* Main Switch */}
        <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
          <div className="flex items-center">
            <div className={`p-2 rounded-full mr-4 ${config.system_enabled ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-slate-200 font-semibold">Sistema Maestro Habilitado</h3>
              <p className="text-slate-400 text-xs">Al deshabilitar, el robot vuelve a inicio y detiene el escaneo.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.system_enabled ? 'bg-green-600' : 'bg-slate-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.system_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-slate-100 font-medium flex items-center border-b border-slate-700 pb-2">
            <Sliders className="w-4 h-4 mr-2 text-orange-500" />
            Parámetros de Escaneo
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trigger Temp */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Disparador de Temp. Máx</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.1"
                  value={config.max_temp_trigger}
                  onChange={(e) => setConfig({...config, max_temp_trigger: parseFloat(e.target.value)})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="absolute right-3 top-2 text-slate-500 text-sm">°C</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Umbral para generar alertas.</p>
            </div>

            {/* Wait Time */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tiempo de Espera</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={config.scan_wait_time_sec}
                  onChange={(e) => setConfig({...config, scan_wait_time_sec: parseInt(e.target.value)})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="absolute right-3 top-2 text-slate-500 text-sm">seg</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Pausa en los bordes del escaneo.</p>
            </div>

            {/* Pan Step Degrees (Nuevo) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Velocidad Angular (Paso)</label>
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Gauge className="h-4 w-4 text-slate-500" />
                 </div>
                <input 
                  type="number"
                  step="0.1"
                  value={config.pan_step_degrees}
                  onChange={(e) => setConfig({...config, pan_step_degrees: parseFloat(e.target.value)})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 pl-10 pr-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="absolute right-3 top-2 text-slate-500 text-sm">deg</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Grados por paso del motor.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button 
            type="button" 
            onClick={loadConfig}
            className="flex items-center text-slate-400 hover:text-white text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Recargar
          </button>

          <button 
            type="submit"
            disabled={saving}
            className="flex items-center bg-orange-600 hover:bg-orange-700 text-white py-2 px-6 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <Save className="w-4 h-4 mr-2" />}
            Guardar Configuración
          </button>
        </div>

        {msg && (
          <div className={`p-4 rounded-md flex items-center ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            <AlertCircle className="w-5 h-5 mr-2" />
            {msg.text}
          </div>
        )}

      </form>
    </div>
  );
};