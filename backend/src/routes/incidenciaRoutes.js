/**
 * ============================================================================
 * RUTAS DE LA API - INCIDENCIAS
 * Recurso principal: listado, alta y cambios de estado (asignar, finalizar,
 * cancelar) mediante PATCH.
 * ============================================================================
 */

import express from 'express';
import incidenciaController from '../controllers/incidenciaController.js';
import { verificarToken, autorizarRol } from '../middlewares/authMiddleware.js';
import {
  validarCrearIncidencia,
  validarActualizarIncidencia,
  validarIniciarAtencion,
  validarFinalizarIncidencia
} from '../validators/incidenciaValidators.js';
import ROLES from '../utils/roles.js';

const router = express.Router();

const verificarEmpleado = [verificarToken, autorizarRol(ROLES.DIRECTOR, ROLES.SISTEMAS, ROLES.MUNICIPAL)];
const verificarTecnico = [verificarToken, autorizarRol(ROLES.DIRECTOR, ROLES.SISTEMAS)];
const verificarSoloMunicipal = [verificarToken, autorizarRol(ROLES.MUNICIPAL)];

/**
 * @openapi
 * /api/v1/incidencias:
 *   get:
 *     tags: [Incidencias]
 *     summary: Listar incidencias según el rol del usuario autenticado con paginación, orden y filtros en base de datos
 *     description: >
 *       Municipal: las incidencias que creó.
 *       Sistemas: las incidencias asignadas a su cargo.
 *       Director: todas las incidencias con posibilidad de filtrar por técnico o creador.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página actual
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de incidencias por página
 *       - in: query
 *         name: order_by
 *         schema:
 *           type: string
 *           enum: [id_incidencia, creado, prioridad, id_estado, descripcion_pedido, articulo_descripcion]
 *           default: creado
 *         description: Columna de ordenamiento validada
 *       - in: query
 *         name: order_dir
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Dirección de ordenamiento
 *       - in: query
 *         name: id_estado
 *         schema:
 *           type: integer
 *         description: Filtrar por estado (1 Pendiente, 2 En Proceso, 3 Resuelta, 4 Cancelada)
 *       - in: query
 *         name: prioridad
 *         schema:
 *           type: integer
 *         description: Filtrar por prioridad (1 Alta, 2 Media, 3 Baja)
 *       - in: query
 *         name: id_articulo
 *         schema:
 *           type: integer
 *         description: Filtrar por artículo
 *       - in: query
 *         name: id_area
 *         schema:
 *           type: integer
 *         description: Filtrar por área
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Búsqueda de texto en pedido, artículo, solicitante o estado
 *     responses:
 *       200:
 *         description: Lista paginada de incidencias con metadata de paginación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Incidencia'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total_pages:
 *                       type: integer
 *                     has_next:
 *                       type: boolean
 *                     has_prev:
 *                       type: boolean
 *       401:
 *         $ref: '#/components/responses/NoAutenticado'
 *       403:
 *         $ref: '#/components/responses/SinPermiso'
 *   post:
 *     tags: [Incidencias]
 *     summary: Reportar una nueva incidencia (solo Empleado Municipal)
 *     description: La incidencia se crea en estado Pendiente y sin técnico asignado.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_articulo, descripcion_pedido]
 *             properties:
 *               id_articulo:
 *                 type: integer
 *                 example: 2
 *               prioridad:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 description: 1 Alta, 2 Media, 3 Baja (por defecto 1)
 *                 example: 2
 *               descripcion_pedido:
 *                 type: string
 *                 maxLength: 250
 *                 example: El monitor parpadea de forma intermitente
 *     responses:
 *       201:
 *         description: Incidencia creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: Incidencia creada correctamente
 *                 incidencia:
 *                   $ref: '#/components/schemas/Incidencia'
 *       400:
 *         $ref: '#/components/responses/Validacion'
 *       401:
 *         $ref: '#/components/responses/NoAutenticado'
 *       403:
 *         $ref: '#/components/responses/SinPermiso'
 *
 * /api/v1/incidencias/{id}/en-proceso:
 *   put:
 *     tags: [Incidencias]
 *     summary: Iniciar atención técnica y pasar de Pendiente a En Proceso (Técnico o Director)
 *     description: Permite al técnico asignado o Director marcar la incidencia en estado En Proceso (id_estado = 2). Solo aplica si la incidencia está Pendiente (1).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Incidencia iniciada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 incidencia:
 *                   $ref: '#/components/schemas/Incidencia'
 *       400:
 *         $ref: '#/components/responses/Validacion'
 *       401:
 *         $ref: '#/components/responses/NoAutenticado'
 *       403:
 *         $ref: '#/components/responses/SinPermiso'
 *       404:
 *         $ref: '#/components/responses/NoEncontrado'
 *
 * /api/v1/incidencias/{id}/finalizar:
 *   put:
 *     tags: [Incidencias]
 *     summary: Finalizar incidencia y registrar solución técnica (Técnico o Director)
 *     description: Permite al técnico asignado o Director finalizar la incidencia pasando a Resuelta (id_estado = 3), registrando la solución técnica y enviando correo al solicitante.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [descripcion_resolucion]
 *             properties:
 *               descripcion_resolucion:
 *                 type: string
 *                 maxLength: 250
 *                 example: Se reemplazó el cable HDMI y el monitor funciona correctamente.
 *     responses:
 *       200:
 *         description: Incidencia finalizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 incidencia:
 *                   $ref: '#/components/schemas/Incidencia'
 *                 notificacion_email:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/Validacion'
 *       401:
 *         $ref: '#/components/responses/NoAutenticado'
 *       403:
 *         $ref: '#/components/responses/SinPermiso'
 *       404:
 *         $ref: '#/components/responses/NoEncontrado'
 *
 * /api/v1/incidencias/{id}:
 *   patch:
 *     tags: [Incidencias]
 *     summary: Asignar, iniciar atención, finalizar o cancelar una incidencia
 *     description: >
 *       Se envía exactamente uno de estos cambios.
 *       Asignar (solo Director): { asignado_a }, la incidencia queda asignada en estado Pendiente (1).
 *       Iniciar atención (Sistemas o Director): { id_estado: 2 }, pasa a En Proceso.
 *       Finalizar (Sistemas o Director): { id_estado: 3, descripcion_resolucion }.
 *       Cancelar: { id_estado: 4 }, solo si está Pendiente. El Municipal cancela las propias y el Director cualquiera.
 *       Al finalizar o cancelar se notifica por correo al solicitante.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_estado:
 *                 type: integer
 *                 enum: [2, 3, 4]
 *                 description: 2 inicia atención, 3 finaliza, 4 cancela
 *               asignado_a:
 *                 type: integer
 *                 description: ID de un técnico activo del área de Sistemas
 *               descripcion_resolucion:
 *                 type: string
 *                 maxLength: 250
 *                 description: Obligatoria cuando id_estado es 3
 *           examples:
 *             asignar:
 *               summary: Asignar a un técnico (Director)
 *               value: { asignado_a: 1 }
 *             iniciar:
 *               summary: Iniciar atención (Sistemas)
 *               value: { id_estado: 2 }
 *             finalizar:
 *               summary: Finalizar con la resolución técnica
 *               value: { id_estado: 3, descripcion_resolucion: Se reemplazó el cable HDMI y el monitor funciona con normalidad }
 *             cancelar:
 *               summary: Cancelar una incidencia Pendiente
 *               value: { id_estado: 4 }
 *     responses:
 *       200:
 *         description: Cambio aplicado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 incidencia:
 *                   $ref: '#/components/schemas/Incidencia'
 *                 notificacion_email:
 *                   type: object
 *                   description: Solo al finalizar. Indica si el correo se envió.
 *                   properties:
 *                     exito:
 *                       type: boolean
 *                     destinatario:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/Validacion'
 *       401:
 *         $ref: '#/components/responses/NoAutenticado'
 *       403:
 *         $ref: '#/components/responses/SinPermiso'
 *       404:
 *         $ref: '#/components/responses/NoEncontrado'
 *       409:
 *         description: La incidencia cambió de estado mientras se procesaba la solicitud
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Listar incidencias (el resultado depende del rol del token)
router.get('/', verificarEmpleado, incidenciaController.listar);
router.get('/mis-incidencias', verificarEmpleado, incidenciaController.listarMisIncidencias);
router.get('/asignadas', verificarEmpleado, incidenciaController.listarAsignadas);

// Crear una incidencia (solo Empleado Municipal)
router.post('/', verificarSoloMunicipal, validarCrearIncidencia, incidenciaController.crear);

// Transiciones de estado de Sistemas / Técnico
router.put('/:id/en-proceso', verificarTecnico, validarIniciarAtencion, incidenciaController.iniciarAtencion);
router.put('/:id/iniciar-atencion', verificarTecnico, validarIniciarAtencion, incidenciaController.iniciarAtencion);
router.put('/:id/finalizar', verificarTecnico, validarFinalizarIncidencia, incidenciaController.finalizar);
router.patch('/:id/finalizar', verificarTecnico, validarFinalizarIncidencia, incidenciaController.finalizar);

// Asignar, finalizar o cancelar (compatibilidad PATCH)
router.patch('/:id', verificarEmpleado, validarActualizarIncidencia, incidenciaController.actualizar);

export default router;