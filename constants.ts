// En desarrollo (npm run dev), usa la IP directa.
// En producción (npm run build), usa una ruta relativa "/api".
// Esto permite que Nginx maneje la redirección al puerto 8080, evitando bloqueos de firewall y CORS.
export const API_BASE_URL = import.meta.env.PROD 
  ? '/api' 
  : 'http://209.94.60.160:8080/api';