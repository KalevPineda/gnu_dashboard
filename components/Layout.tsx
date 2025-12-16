import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Settings, Flame, FolderDown, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Panel de Control', icon: LayoutDashboard, path: '/' },
    { label: 'Análisis y Alertas', icon: Activity, path: '/analysis' },
    { label: 'Archivos y Exportación', icon: FolderDown, path: '/downloads' },
    { label: 'Configuración', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="absolute top-0 left-0 w-64 h-full bg-slate-900 shadow-2xl border-r border-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
                <div className="flex items-center">
                  <Flame className="w-6 h-6 text-orange-500 mr-2" />
                  <span className="font-bold text-lg">SentinelCore</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-6 h-6" />
                </button>
             </div>
             
             <nav className="flex-1 py-6 px-3 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
                    `}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </NavLink>
                ))}
             </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Flame className="w-6 h-6 text-orange-500 mr-2" />
          <span className="font-bold text-lg tracking-tight">Sentinel<span className="text-orange-500">Core</span></span>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
              `}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Estado del Sistema</p>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
              <span className="text-sm font-semibold text-green-400">Conectado</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-950">
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between sticky top-0 z-10">
          <div className="flex items-center">
             <Flame className="w-6 h-6 text-orange-500 mr-2" />
             <span className="font-bold">SentinelCore</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
             <Menu className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};