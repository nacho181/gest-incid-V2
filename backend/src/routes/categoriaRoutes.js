/**
 * ============================================================================
 * RUTAS DE LA API - MÓDULO CATEGORÍAS (ENTIDADES BASE)
 * Endpoints REST para BREAD de Categorías
 * ============================================================================
 */

import express from 'express';
import { body } from 'express-validator';
import categoriaController from '../controllers/categoriaController.js';
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
 * /api/v1/categorias:
 *   get:
 *     tags: [Categorías]
 *     summary: Obtener todas las categorías con paginación, orden y filtros en base de datos (Browse)
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
 *         description: Cantidad de categorías por página
 *       - in: query
 *         name: order_by
 *         schema:
 *           type: string
 *           enum: [id_categoria, descripcion, activo]
 *           default: id_categoria
 *         description: Columna de ordenamiento validada
 *       - in: query
 *         name: order_dir
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Dirección de ordenamiento
 *       - in: query
 *         name: buscar
 *         schema:
 *           type: string
 *         description: Término de búsqueda en descripción
 *       - in: query
 *         name: incluir_inactivos
 *         schema:
 *           type: boolean
 *         description: Incluir categorías dadas de baja lógica
 *     responses:
 *       200:
 *         description: Lista paginada de categorías con metadata de paginación
 *   post:
 *     tags: [Categorías]
 *     summary: Crear una nueva categoría (Add)
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
 *     responses:
 *       201:
 *         description: Categoría creada
 * 
 * /api/v1/categorias/{id}:
 *   get:
 *     tags: [Categorías]
 *     summary: Obtener detalle de una categoría (Read)
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
 *         description: Detalle de la categoría
 *   put:
 *     tags: [Categorías]
 *     summary: Actualizar una categoría (Edit)
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
 *     responses:
 *       200:
 *         description: Categoría actualizada
 *   delete:
 *     tags: [Categorías]
 *     summary: Baja lógica de una categoría (Soft Delete)
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
 *         description: Categoría dada de baja
 */

// BROWSE: Listar categorías
router.get('/', verificarLectura, categoriaController.getCategorias);

// READ: Obtener detalle de una categoría por ID
router.get('/:id', verificarLectura, validarId, categoriaController.getCategoriaById);

// ADD: Crear una nueva categoría
router.post(
  '/',
  verificarAdmin,
  [
    body('descripcion')
      .trim()
      .notEmpty().withMessage('La descripción es obligatoria')
      .isLength({ min: 3, max: 255 }).withMessage('La descripción debe tener entre 3 y 255 caracteres'),
    validarCampos
  ],
  categoriaController.crearCategoria
);

// EDIT: Actualizar una categoría existente (PUT)
router.put(
  '/:id',
  verificarAdmin,
  validarId,
  [
    body('descripcion')
      .optional()
      .trim()
      .notEmpty().withMessage('La descripción no puede estar vacía')
      .isLength({ min: 3, max: 255 }).withMessage('La descripción debe tener entre 3 y 255 caracteres'),
    body('activo')
      .optional()
      .isInt({ min: 0, max: 1 }).withMessage('El estado debe ser 0 (inactivo) o 1 (activo)'),
    validarCampos
  ],
  categoriaController.actualizarCategoria
);

// EDIT: Actualizar una categoría existente (PATCH)
router.patch(
  '/:id',
  verificarAdmin,
  validarId,
  [
    body('descripcion')
      .optional()
      .trim()
      .notEmpty().withMessage('La descripción no puede estar vacía')
      .isLength({ min: 3, max: 255 }).withMessage('La descripción debe tener entre 3 y 255 caracteres'),
    body('activo')
      .optional()
      .isInt({ min: 0, max: 1 }).withMessage('El estado debe ser 0 (inactivo) o 1 (activo)'),
    validarCampos
  ],
  categoriaController.actualizarCategoria
);

// DELETE: Borrado lógico / Soft delete (NO borrado físico)
router.delete('/:id', verificarAdmin, validarId, categoriaController.eliminarCategoria);


export default router;