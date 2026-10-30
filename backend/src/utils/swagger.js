import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Incidencias - Municipalidad de Concordia',
      version: '1.0.0',
      description: 'Documentación de la API REST para el Trabajo Final Integrador',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local'
      }
    ],
    tags: [
      { name: 'Autenticación', description: 'Inicio de sesión y perfil' },
      { name: 'Empleados', description: 'Reporte y listado de incidencias propias' },
      { name: 'Sistemas', description: 'Incidencias asignadas a técnicos' },
      { name: 'Director', description: 'Dashboard, asignación y reportes' },
      { name: 'Categorías', description: 'BREAD de categorías' },
      { name: 'Artículos', description: 'BREAD de artículos' },
      { name: 'Áreas', description: 'Consulta de áreas' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], 
};

const swaggerSpec = swaggerJSDoc(options);

const swaggerDocs = (app) => {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📄 Documentación Swagger disponible en http://localhost:3000/api/v1/docs');
};

export default swaggerDocs;
