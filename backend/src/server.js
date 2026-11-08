/**
 * ============================================================================
 * SERVIDOR PRINCIPAL HTTP - EXPRESS
 * Punto de entrada de la aplicación backend Node.js.
 * Configuración de middlewares, archivos estáticos y rutas de la API.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import helmet from 'helmet';

import swaggerDocs from './utils/swagger.js';
import authRoutes from './routes/authRoutes.js';
import incidenciaRoutes from './routes/incidenciaRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import estadisticasRoutes from './routes/estadisticasRoutes.js';
import categoriaRoutes from './routes/categoriaRoutes.js';
import articuloRoutes from './routes/articuloRoutes.js';
import areaRoutes from './routes/areaRoutes.js';
import { errorHandler, notFoundApi } from './middlewares/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARES DE LA APLICACIÓN
// El orden importa: cada middleware solo afecta a lo que se registra después.
// ============================================================================

// Control de acceso HTTP (CORS)
// Orígenes permitidos por CORS (configurables desde el .env)
const origenesPermitidos = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Sin cabecera Origin (curl, tests, mismo origen): se permite
    if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
    const error = new Error('Origen no permitido por CORS');
    error.statusCode = 403;
    return callback(error);
  }
}));

// Morgan: Registro detallado de solicitudes HTTP en consola
app.use(morgan('dev'));

// Parseo de cuerpos con tamaño máximo
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Documentación Swagger (antes de helmet para no restringir su interfaz)
swaggerDocs(app);

// Cabeceras de seguridad HTTP (antes de los estáticos y las rutas para que les apliquen)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // La intranet puede servirse por HTTP: no forzar la subida a HTTPS
      'upgrade-insecure-requests': null
    }
  }
}));

// Servidor de archivos estáticos (Frontend Web empaquetado o desarrollo)
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.use(express.static(path.join(__dirname, '../../frontend')));

// ============================================================================
// RUTAS DE LA API REST Y COMPROBACIÓN DE SALUD
// ============================================================================

// Autenticación
app.use('/api/v1/auth', authRoutes);

// Recursos principales
app.use('/api/v1/incidencias', incidenciaRoutes);
app.use('/api/v1/usuarios', usuarioRoutes);

// Entidades Base: BREAD de Categorías y Artículos, y consulta de Áreas
app.use('/api/v1/categorias', categoriaRoutes);
app.use('/api/v1/articulos', articuloRoutes);
app.use('/api/v1/areas', areaRoutes);

// Estadísticas del Director: /dashboard y /reportes
app.use('/api/v1', estadisticasRoutes);

// Ruta de Comprobación de Salud del Servidor (Healthcheck)
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    estado: 'OK',
    mensaje: 'Servidor activo - Municipalidad de Concordia',
    timestamp: new Date()
  });
});

// 404 en JSON para rutas /api inexistentes
app.use('/api', notFoundApi);

// Fallback del frontend (excluye /api)
app.get(/^\/(?!api).*/, (req, res) => {
  const distIndex = path.join(__dirname, '../../frontend/dist/index.html');
  const srcIndex = path.join(__dirname, '../../frontend/index.html');
  res.sendFile(fs.existsSync(distIndex) ? distIndex : srcIndex);
});

// Manejador global de errores (siempre al final)
app.use(errorHandler);

// ============================================================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================================================

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`Accede a la interfaz web en http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

export default app;