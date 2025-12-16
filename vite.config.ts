import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables de entorno desde el archivo .env ubicado en la raíz
  // El tercer parámetro '' le dice a Vite que cargue todas las variables, no solo las que empiezan con VITE_
  // Fixed: Use '.' instead of process.cwd() to avoid type error 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Esto reemplaza "process.env.API_KEY" en tu código React con el valor real
      // durante la compilación.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});