/**
 * ============================================================================
 * PRUEBAS DE INTEGRACIÓN: BREAD DE CATEGORÍAS Y ARTÍCULOS (ENTIDADES BASE)
 * Verificación completa de las operaciones
 * ============================================================================
 */

import assert from 'assert';
import http from 'http';
import setupTestDb from './setupTestDb.js';
import app from '../src/server.js';

let server;
const PORT = 3003;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  await setupTestDb();
  server = http.createServer(app);
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`\n🚀 Servidor de pruebas para Entidades Base iniciado en el puerto ${PORT}\n`);

  try {
    // Autenticación previa como Empleado de Sistemas (carper@correo.com)
    console.log('Login de prueba como Empleado de Sistemas (carper@correo.com)...');
    const resLogin = await request('POST', '/api/v1/auth/login', {
      usuario: 'carper@correo.com',
      contrasenia: 'carper'
    });
    assert.strictEqual(resLogin.status, 200);
    const token = resLogin.body.token;
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // ========================================================================
    // SECCIÓN 1: BREAD DE CATEGORÍAS
    // ========================================================================
    console.log('--- PRUEBAS: BREAD DE CATEGORÍAS ---');

    // 1. Browse (Listar activas)
    console.log('Test 1: [Browse] Listar categorías activas...');
    const resBrowseCat = await request('GET', '/api/v1/categorias', null, authHeaders);
    assert.strictEqual(resBrowseCat.status, 200);
    assert.strictEqual(Array.isArray(resBrowseCat.body), true);
    const todasActivas = resBrowseCat.body.every(c => c.activo === 1);
    assert.strictEqual(todasActivas, true, 'Todas las categorías listadas deben estar activas por defecto');
    console.log(`   ✅ Se listaron ${resBrowseCat.body.length} categorías activas.`);

    // 2. Add (Crear categoría)
    console.log('Test 2: [Add] Crear nueva categoría...');
    const catNombre = `Servidores y Redes Test ${Date.now()}`;
    const resAddCat = await request('POST', '/api/v1/categorias', {
      descripcion: catNombre
    }, authHeaders);
    assert.strictEqual(resAddCat.status, 201);
    const idCatCreada = resAddCat.body.id_categoria;
    assert.ok(idCatCreada, 'Debe retornar el ID de la categoría creada');
    assert.strictEqual(resAddCat.body.descripcion, catNombre);
    assert.strictEqual(resAddCat.body.activo, 1, 'La nueva categoría debe crearse con activo = 1');
    console.log(`   ✅ Categoría creada exitosamente con ID #${idCatCreada}`);

    // 3. Read (Consultar por ID)
    console.log('Test 3: [Read] Consultar categoría por ID...');
    const resReadCat = await request('GET', `/api/v1/categorias/${idCatCreada}`, null, authHeaders);
    assert.strictEqual(resReadCat.status, 200);
    assert.strictEqual(resReadCat.body.id_categoria, idCatCreada);
    assert.strictEqual(resReadCat.body.descripcion, catNombre);
    assert.strictEqual(resReadCat.body.activo, 1);
    console.log(`   ✅ Lectura de categoría #${idCatCreada} verificada.`);

    // 4. Edit (Actualizar descripción)
    console.log('Test 4: [Edit] Actualizar categoría...');
    const catNombreEditado = `${catNombre} (Modificado)`;
    const resEditCat = await request('PUT', `/api/v1/categorias/${idCatCreada}`, {
      descripcion: catNombreEditado
    }, authHeaders);
    assert.strictEqual(resEditCat.status, 200);
    assert.strictEqual(resEditCat.body.descripcion, catNombreEditado);
    console.log(`   ✅ Categoría #${idCatCreada} modificada correctamente.`);

    // 5. Delete (Soft delete / Borrado lógico)
    console.log('Test 5: [Delete] Borrado lógico (Soft delete) de categoría...');
    const resDelCat = await request('DELETE', `/api/v1/categorias/${idCatCreada}`, null, authHeaders);
    assert.strictEqual(resDelCat.status, 200);
    assert.strictEqual(resDelCat.body.activo, 0, 'El campo activo debe actualizarse a 0 (soft delete)');
    console.log(`   ✅ Borrado lógico ejecutado para categoría #${idCatCreada}.`);

    // 6. Verificar que NO hubo borrado físico
    console.log('Test 6: [Verificación Soft Delete] Comprobar persistencia con activo = 0...');
    const resCheckCat = await request('GET', `/api/v1/categorias/${idCatCreada}`, null, authHeaders);
    assert.strictEqual(resCheckCat.status, 200, 'El registro DEBE seguir existiendo en el sistema');
    assert.strictEqual(resCheckCat.body.activo, 0, 'El estado DEBE ser inactivo (activo = 0)');

    const resBrowseCat2 = await request('GET', '/api/v1/categorias', null, authHeaders);
    const estaEnBrowseActivo = resBrowseCat2.body.some(c => c.id_categoria === idCatCreada);
    assert.strictEqual(estaEnBrowseActivo, false, 'No debe aparecer en el listado de activos');

    const resBrowseCatInact = await request('GET', '/api/v1/categorias?incluir_inactivos=true', null, authHeaders);
    const estaEnBrowseInact = resBrowseCatInact.body.some(c => c.id_categoria === idCatCreada);
    assert.strictEqual(estaEnBrowseInact, true, 'DEBE aparecer al solicitar incluir_inactivos=true');
    console.log('   ✅ Verificado: Borrado físico NO utilizado. El registro permanece con activo = 0.');

    // 7. Reactivar categoría
    console.log('Test 7: [Reactivar] Reactivación de categoría dada de baja...');
    const resReactCat = await request('PUT', `/api/v1/categorias/${idCatCreada}/reactivar`, null, authHeaders);
    assert.strictEqual(resReactCat.status, 200);
    assert.strictEqual(resReactCat.body.activo, 1);
    console.log(`   ✅ Categoría #${idCatCreada} reactivada exitosamente.`);

    // 8. Validaciones de Categoría
    console.log('Test 8: Validaciones de Categoría (Campos requeridos y 404)...');
    const resValEmpty = await request('POST', '/api/v1/categorias', { descripcion: '   ' }, authHeaders);
    assert.strictEqual(resValEmpty.status, 400, 'Debe rechazar descripción vacía con 400');
    const resVal404 = await request('GET', '/api/v1/categorias/999999', null, authHeaders);
    assert.strictEqual(resVal404.status, 404, 'Debe devolver 404 si la categoría no existe');
    console.log('   ✅ Validaciones de categoría comprobadas correctamente.');

    // ========================================================================
    // SECCIÓN 2: BREAD DE ARTÍCULOS
    // ========================================================================
    console.log('\n--- PRUEBAS: BREAD DE ARTÍCULOS ---');

    // 9. Browse (Listar activos)
    console.log('Test 9: [Browse] Listar artículos activos...');
    const resBrowseArt = await request('GET', '/api/v1/articulos', null, authHeaders);
    assert.strictEqual(resBrowseArt.status, 200);
    assert.strictEqual(Array.isArray(resBrowseArt.body), true);
    const todosArtActivos = resBrowseArt.body.every(a => a.activo === 1);
    assert.strictEqual(todosArtActivos, true, 'Todos los artículos listados deben estar activos por defecto');
    console.log(`   ✅ Se listaron ${resBrowseArt.body.length} artículos activos.`);

    // 10. Add (Crear artículo)
    console.log('Test 10: [Add] Crear nuevo artículo con área y categoría...');
    const artNombre = `Impresora Multifunción HP ${Date.now()}`;
    const resAddArt = await request('POST', '/api/v1/articulos', {
      descripcion: artNombre,
      id_categoria: idCatCreada,
      id_area: 1 // Legales
    }, authHeaders);
    assert.strictEqual(resAddArt.status, 201);
    const idArtCreado = resAddArt.body.id_articulo;
    assert.ok(idArtCreado, 'Debe retornar el ID del artículo creado');
    assert.strictEqual(resAddArt.body.descripcion, artNombre);
    assert.strictEqual(resAddArt.body.id_categoria, idCatCreada);
    assert.strictEqual(resAddArt.body.id_area, 1);
    assert.strictEqual(resAddArt.body.activo, 1, 'El nuevo artículo debe crearse con activo = 1');
    assert.ok(resAddArt.body.categoria_descripcion, 'Debe incluir la descripción de la categoría');
    assert.ok(resAddArt.body.area_descripcion, 'Debe incluir la descripción del área');
    console.log(`   ✅ Artículo creado exitosamente con ID #${idArtCreado}`);

    // 11. Read (Consultar por ID)
    console.log('Test 11: [Read] Consultar artículo por ID...');
    const resReadArt = await request('GET', `/api/v1/articulos/${idArtCreado}`, null, authHeaders);
    assert.strictEqual(resReadArt.status, 200);
    assert.strictEqual(resReadArt.body.id_articulo, idArtCreado);
    assert.strictEqual(resReadArt.body.descripcion, artNombre);
    assert.strictEqual(resReadArt.body.activo, 1);
    assert.ok(resReadArt.body.categoria_descripcion);
    assert.ok(resReadArt.body.area_descripcion);
    console.log(`   ✅ Lectura de artículo #${idArtCreado} con relaciones verificada.`);

    // 12. Edit (Actualizar descripción y área)
    console.log('Test 12: [Edit] Actualizar artículo...');
    const artNombreEditado = `${artNombre} (Reubicada en Sistemas)`;
    const resEditArt = await request('PUT', `/api/v1/articulos/${idArtCreado}`, {
      descripcion: artNombreEditado,
      id_area: 3 // Sistemas
    }, authHeaders);
    assert.strictEqual(resEditArt.status, 200);
    assert.strictEqual(resEditArt.body.descripcion, artNombreEditado);
    assert.strictEqual(resEditArt.body.id_area, 3);
    console.log(`   ✅ Artículo #${idArtCreado} actualizado correctamente.`);

    // 13. Delete (Soft delete / Borrado lógico)
    console.log('Test 13: [Delete] Borrado lógico (Soft delete) de artículo...');
    const resDelArt = await request('DELETE', `/api/v1/articulos/${idArtCreado}`, null, authHeaders);
    assert.strictEqual(resDelArt.status, 200);
    assert.strictEqual(resDelArt.body.activo, 0, 'El campo activo debe actualizarse a 0 (soft delete)');
    console.log(`   ✅ Borrado lógico ejecutado para artículo #${idArtCreado}.`);

    // 14. Verificar que NO hubo borrado físico del artículo
    console.log('Test 14: [Verificación Soft Delete] Comprobar persistencia del artículo con activo = 0...');
    const resCheckArt = await request('GET', `/api/v1/articulos/${idArtCreado}`, null, authHeaders);
    assert.strictEqual(resCheckArt.status, 200, 'El registro del artículo DEBE seguir existiendo en la base de datos');
    assert.strictEqual(resCheckArt.body.activo, 0, 'El estado del artículo DEBE ser 0 (inactivo)');

    const resBrowseArt2 = await request('GET', '/api/v1/articulos', null, authHeaders);
    const estaEnBrowseArtActivo = resBrowseArt2.body.some(a => a.id_articulo === idArtCreado);
    assert.strictEqual(estaEnBrowseArtActivo, false, 'No debe aparecer en el listado activo estándar');

    const resBrowseArtInact = await request('GET', '/api/v1/articulos?incluir_inactivos=true', null, authHeaders);
    const estaEnBrowseArtInact = resBrowseArtInact.body.some(a => a.id_articulo === idArtCreado);
    assert.strictEqual(estaEnBrowseArtInact, true, 'DEBE aparecer cuando se solicita incluir_inactivos=true');
    console.log('   ✅ Verificado: Borrado físico NO utilizado. El artículo permanece con activo = 0.');

    // 15. Reactivar artículo
    console.log('Test 15: [Reactivar] Reactivación de artículo...');
    const resReactArt = await request('PUT', `/api/v1/articulos/${idArtCreado}/reactivar`, null, authHeaders);
    assert.strictEqual(resReactArt.status, 200);
    assert.strictEqual(resReactArt.body.activo, 1);
    console.log(`   ✅ Artículo #${idArtCreado} reactivado exitosamente.`);

    // 16. Validaciones de Artículo
    console.log('Test 16: Validaciones de Artículo (Campos requeridos, FK inválidas y 404)...');
    const resValArtFalta = await request('POST', '/api/v1/articulos', { descripcion: 'Incompleto' }, authHeaders);
    assert.strictEqual(resValArtFalta.status, 400, 'Debe rechazar artículo sin categoría o área');
    const resValArtCatInvalida = await request('POST', '/api/v1/articulos', {
      descripcion: 'Test',
      id_categoria: 999999,
      id_area: 1
    }, authHeaders);
    assert.strictEqual(resValArtCatInvalida.status, 400, 'Debe rechazar categoría inexistente con 400');
    const resValArt404 = await request('GET', '/api/v1/articulos/999999', null, authHeaders);
    assert.strictEqual(resValArt404.status, 404, 'Debe devolver 404 si el artículo no existe');
    console.log('   ✅ Validaciones de artículo comprobadas correctamente.');

    // ========================================================================
    // SECCIÓN 3: ÁREAS MUNICIPALES
    // ========================================================================
    console.log('\n--- PRUEBAS: ÁREAS ---');
    console.log('Test 17: Listado de Áreas activas...');
    const resAreas = await request('GET', '/api/v1/areas');
    assert.strictEqual(resAreas.status, 200);
    assert.strictEqual(Array.isArray(resAreas.body), true);
    assert.ok(resAreas.body.length > 0);
    console.log(`   ✅ Se listaron ${resAreas.body.length} áreas municipales activas.`);

    console.log('\n========================================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE ENTIDADES BASE (BREAD Y SOFT DELETES) PASARON EXITOSAMENTE!');
    console.log('========================================================================\n');

  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS DE ENTIDADES BASE:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
