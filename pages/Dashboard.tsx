import React, { useEffect, useState } from 'react';
import { Activity, Thermometer, RotateCw, Wifi, Clock, Server, Mail, CheckCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LiveStatus, AlertRecord } from '../types';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';

export const Dashboard: React.FC = () => {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [history, setHistory] = useState<{time: string, temp: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ visible: boolean; type: 'alert' | 'info'; message: string; subMessage?: string } | null>(null);
  const [emailSentTimestamp, setEmailSentTimestamp] = useState<number>(0);

  // Polling effect
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [liveData, alertsData] = await Promise.all([
          api.getLiveStatus(),
          api.getAlerts()
        ]);
        
        setStatus(liveData);

        // Process alerts for historical chart (last 10 alerts reversed)
        const historyData = alertsData.slice(0, 15).reverse().map(alert => ({
          time: new Date(alert.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          temp: alert.max_temp
        }));
        setHistory(historyData);

        // Notification Logic
        if (liveData.current_max_temp > 60) {
          const now = Date.now();
          if (now - emailSentTimestamp > 60000) {
            triggerEmailSimulation(liveData.current_max_temp);
            setEmailSentTimestamp(now);
          }
        } else {
          if (notification?.type === 'alert' && liveData.current_max_temp < 55) {
            setNotification(null);
          }
        }
      } catch (e) {
        console.error("Dashboard sync error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData(); 
    const intervalId = setInterval(fetchData, 3000); 

    return () => clearInterval(intervalId);
  }, [emailSentTimestamp, notification]);

  const triggerEmailSimulation = (temp: number) => {
    setNotification({
      visible: true,
      type: 'alert',
      message: `¡Alerta de Temperatura Crítica! (${temp.toFixed(1)}°C)`,
      subMessage: 'Enviando notificaciones al equipo de soporte...'
    });

    setTimeout(() => {
      setNotification({
        visible: true,
        type: 'info',
        message: 'Correo de Alerta Enviado',
        subMessage: `Notificación despachada a admin@sentinelcore.com`
      });
      setTimeout(() => setNotification(null), 5000);
    }, 2500);
  };

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const lastUpdateDate = new Date(status.last_update * 1000).toLocaleTimeString();
  const isOnline = status.is_online;
  const isHot = status.current_max_temp > 60;

  return (
    <div className="space-y-6 relative">
      {/* Notifications */}
      {notification && notification.visible && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-2xl border transition-all duration-500 transform translate-y-0 ${
          notification.type === 'alert' 
            ? 'bg-red-900/90 border-red-500 text-white' 
            : 'bg-green-900/90 border-green-500 text-white'
        } max-w-md w-full animate-bounce-in`}>
          <div className="flex items-start">
            <div className={`p-2 rounded-full mr-3 ${notification.type === 'alert' ? 'bg-red-800' : 'bg-green-800'}`}>
              {notification.type === 'alert' ? <Mail className="w-5 h-5 animate-pulse" /> : <CheckCircle className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="font-bold text-sm">{notification.message}</h4>
              <p className="text-xs opacity-90 mt-1">{notification.subMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Centro de Mando</h1>
          <p className="text-slate-400 text-sm mt-1">Telemetría en tiempo real de unidades SentinelCore</p>
        </div>
        <div className={`mt-4 md:mt-0 px-4 py-2 rounded-full border flex items-center ${isOnline ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm font-semibold uppercase">{status.mode === 'Scanning' ? 'Escaneando' : status.mode}</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Temp. Máxima" 
          value={status.current_max_temp.toFixed(1)} 
          subtext="°C"
          icon={Thermometer} 
          colorClass={isHot ? "text-red-500" : "text-orange-400"}
          trend={isHot ? 'up' : 'neutral'}
        />
        <StatCard 
          title="Ángulo Rotación" 
          value={status.current_angle.toFixed(1)} 
          subtext="grados"
          icon={RotateCw} 
          colorClass="text-blue-400"
        />
        <StatCard 
          title="ID Turbina" 
          value={status.turbine_token.split('-')[0] + '...'} 
          icon={Server} 
          colorClass="text-purple-400"
        />
        <StatCard 
          title="Última Sinc." 
          value={lastUpdateDate} 
          icon={Clock} 
          colorClass="text-slate-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Live View */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm min-h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-orange-500" />
            Gradiente Térmico en Vivo
          </h3>
          <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/20 via-slate-950 to-slate-950"></div>
            
            <div 
              className="relative w-64 h-64 border-2 border-dashed border-slate-700 rounded-full flex items-center justify-center transition-transform duration-500"
              style={{ transform: `rotate(${status.current_angle}deg)` }}
            >
              <div className="absolute top-0 w-1 h-4 bg-orange-500"></div>
              <div className="text-slate-500 font-mono text-xs">ROTOR</div>
            </div>

            <div className="absolute bottom-4 left-4">
               <div className="flex items-center space-x-2">
                 <div className={`w-3 h-3 rounded-sm ${isHot ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`}></div>
                 <span className="text-xs text-slate-400">{isHot ? 'Punto Caliente Detectado' : 'Escaneo Normal'}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Status Feed & Health */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
            <Wifi className="w-5 h-5 mr-2 text-blue-500" />
            Salud del Sistema
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Conexión</span>
              <span className="text-green-400 text-sm font-medium">Estable (14ms)</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Almacenamiento</span>
              <span className="text-orange-400 text-sm font-medium">45% Usado</span>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-800">
               <h4 className="text-sm font-medium text-slate-300 mb-4">Histórico de Picos (°C)</h4>
               <div className="h-40 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 10}} interval="preserveStartEnd" />
                      <YAxis stroke="#64748b" tick={{fontSize: 10}} domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                        itemStyle={{ color: '#f97316' }}
                      />
                      <Line type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} dot={{r: 2}} activeDot={{r: 4}} />
                    </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};