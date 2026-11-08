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

/**
 * @openapi
 * /api/v1/categorias:
 *   get:
 *     tags: [Categorías]
 *     summary: Obtener todas las categorías (Browse)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorías
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
router.get('/', verificarAdmin, categoriaController.getCategorias);

// READ: Obtener detalle de una categoría por ID
router.get('/:id', verificarAdmin, validarId, categoriaController.getCategoriaById);

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