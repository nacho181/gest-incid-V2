/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO ARTÍCULOS (ENTIDADES BASE)
 * Endpoints REST para BREAD de Artículos
 * ============================================================================
 */

import express from 'express';
import { body } from 'express-validator';
import articuloController from '../controllers/articuloController.js';
import { verificarToken, autorizarRol } from '../middlewares/authMiddleware.js';
import { validarCampos } from '../middlewares/validar.js';
import { validarId } from '../validators/incidenciaValidators.js';
import ROLES from '../utils/roles.js';

const router = express.Router();

// Middleware estricto para validar token JWT y verificar roles del Área de Sistemas
const verificarAdmin = [verificarToken, autorizarRol(ROLES.SISTEMAS)];
const verificarLectura = [verificarToken, autorizarRol(ROLES.DIRECTOR, ROLES.SISTEMAS, ROLES.MUNICIPAL)];

/**
 * @openapi
 * /api/v1/articulos:
 *   get:
 *     tags: [Artículos]
 *     summary: Obtener todos los artículos con paginación, orden y filtros en base de datos (Browse)
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
 *         description: Cantidad de artículos por página
 *       - in: query
 *         name: order_by
 *         schema:
 *           type: string
 *           enum: [id_articulo, descripcion, id_area, id_categoria, activo]
 *           default: id_articulo
 *         description: Columna de ordenamiento validada
 *       - in: query
 *         name: order_dir
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Dirección de ordenamiento
 *       - in: query
 *         name: id_categoria
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de categoría
 *       - in: query
 *         name: id_area
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de área
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Término de búsqueda en descripción
 *     responses:
 *       200:
 *         description: Lista paginada de artículos con metadata de paginación
 *   post:
 *     tags: [Artículos]
 *     summary: Crear un nuevo artículo (Add)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion:
 *                 type: string
 *               id_categoria:
 *                 type: integer
 *               id_area:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Artículo creado exitosamente
 * 
 * /api/v1/articulos/{id}:
 *   get:
 *     tags: [Artículos]
 *     summary: Obtener detalle de un artículo (Read)
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
 *         description: Detalle del artículo
 *   put:
 *     tags: [Artículos]
 *     summary: Actualizar un artículo (Edit)
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
 *               descripcion:
 *                 type: string
 *               id_categoria:
 *                 type: integer
 *               id_area:
 *                 type: integer
 *               activo:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Artículo actualizado
 *   delete:
 *     tags: [Artículos]
 *     summary: Baja lógica de un artículo (Soft Delete)
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
 *         description: Artículo dado de baja
 */

// BROWSE: Listar artículos activos con filtros opcionales
router.get('/', verificarLectura, articuloController.getArticulos);

// READ: Obtener detalle de un artículo por ID
router.get('/:id', verificarLectura, validarId, articuloController.getArticuloById);

// ADD: Crear un nuevo artículo
router.post(
  '/',
  verificarAdmin,
  [
    body('descripcion')
      .trim()
      .notEmpty().withMessage('La descripción es obligatoria')
      .isLength({ min: 3, max: 250 }).withMessage('La descripción debe tener entre 3 y 250 caracteres'),
    body('id_categoria')
      .notEmpty().withMessage('El ID de la categoría es obligatorio')
      .isInt({ min: 1 }).withMessage('El ID de la categoría debe ser un número entero mayor a 0'),
    body('id_area')
      .notEmpty().withMessage('El ID del área es obligatorio')
      .isInt({ min: 1 }).withMessage('El ID del área debe ser un número entero mayor a 0'),
    validarCampos
  ],
  articuloController.crearArticulo
);

// EDIT: Actualizar un artículo existente (PUT)
router.put(
  '/:id',
  verificarAdmin,
  validarId,
  [
    body('descripcion')
      .optional()
      .trim()
      .notEmpty().withMessage('La descripción no puede estar vacía')
      .isLength({ min: 3, max: 250 }).withMessage('La descripción debe tener entre 3 y 250 caracteres'),
    body('id_categoria')
      .optional()
      .isInt({ min: 1 }).withMessage('El ID de la categoría debe ser un número entero'),
    body('id_area')
      .optional()
      .isInt({ min: 1 }).withMessage('El ID del área debe ser un número entero'),
    body('activo')
      .optional()
      .isInt({ min: 0, max: 1 }).withMessage('El estado debe ser 0 (inactivo) o 1 (activo)'),
    validarCampos
  ],
  articuloController.actualizarArticulo
);

// EDIT: Actualizar un artículo existente (PATCH)
router.patch(
  '/:id',
  verificarAdmin,
  validarId,
  [
    body('descripcion')
      .optional()
      .trim()
      .notEmpty().withMessage('La descripción no puede estar vacía')
      .isLength({ min: 3, max: 250 }).withMessage('La descripción debe tener entre 3 y 250 caracteres'),
    body('id_categoria')
      .optional()
      .isInt({ min: 1 }).withMessage('El ID de la categoría debe ser un número entero'),
    body('id_area')
      .optional()
      .isInt({ min: 1 }).withMessage('El ID del área debe ser un número entero'),
    body('activo')
      .optional()
      .isInt({ min: 0, max: 1 }).withMessage('El estado debe ser 0 (inactivo) o 1 (activo)'),
    validarCampos
  ],
  articuloController.actualizarArticulo
);

// DELETE: Borrado lógico / Soft delete (NO borrado físico)
router.delete('/:id', verificarAdmin, validarId, articuloController.eliminarArticulo);


export default router;