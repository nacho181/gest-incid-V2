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
      { name: 'Incidencias', description: 'Alta, listado y cambios de estado de incidencias' },
      { name: 'Usuarios', description: 'Consulta de personal' },
      { name: 'Director', description: 'Dashboard y reportes estadísticos' },
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
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'boolean', example: true },
            mensaje: { type: 'string', example: 'Descripción del error' },
            errores: {
              type: 'array',
              description: 'Solo aparece en errores de validación (400)',
              items: {
                type: 'object',
                properties: {
                  campo: { type: 'string', example: 'prioridad' },
                  mensaje: { type: 'string', example: 'La prioridad debe ser 1 (alta), 2 (media) o 3 (baja)' }
                }
              }
            }
          }
        },
        Incidencia: {
          type: 'object',
          properties: {
            id_incidencia: { type: 'integer', example: 12 },
            id_articulo: { type: 'integer', example: 2 },
            id_estado: {
              type: 'integer',
              description: '1 Pendiente, 2 En Proceso, 3 Resuelta, 4 Cancelada',
              example: 1
            },
            creado_por: { type: 'integer', example: 4 },
            asignado_a: { type: 'integer', description: '0 = Sin asignar', example: 0 },
            creado: { type: 'string', format: 'date-time' },
            prioridad: { type: 'integer', description: '1 Alta, 2 Media, 3 Baja', example: 1 },
            descripcion_pedido: { type: 'string', maxLength: 250 },
            descripcion_resolucion: { type: 'string', maxLength: 250 }
          }
        }
      },
      responses: {
        Validacion: {
          description: 'Datos de entrada inválidos',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        },
        NoAutenticado: {
          description: 'Token ausente, inválido o vencido',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        },
        SinPermiso: {
          description: 'El rol del usuario no permite la operación',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        },
        NoEncontrado: {
          description: 'Recurso inexistente',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        }
      }
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
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

export default swaggerDocs;