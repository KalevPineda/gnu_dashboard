import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  colorClass?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, icon: Icon, colorClass = "text-slate-100", trend }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
        </div>
        <div className={`p-2 rounded-lg bg-slate-800 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="flex items-end">
        <h2 className={`text-3xl font-bold ${colorClass}`}>{value}</h2>
        {subtext && <span className="text-slate-500 text-sm ml-2 mb-1">{subtext}</span>}
      </div>
      
      {trend === 'up' && (
        <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-red-500/10 to-transparent"></div>
      )}
    </div>
  );
};