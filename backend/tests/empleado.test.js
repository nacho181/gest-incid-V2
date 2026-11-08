/**
 * ============================================================================
 * PRUEBAS DE INTEGRACIÓN DE LA API REST - MÓDULO DE EMPLEADOS
 * Ejecución de pruebas automatizadas sobre el servidor de pruebas HTTP.
 * ============================================================================
 */

import assert from 'assert';
import http from 'http';
import setupTestDb from './setupTestDb.js';
import app from '../src/server.js';

let server;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
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
  await new Promise(resolve => server.listen(3001, resolve));
  console.log('Servidor de pruebas escuchando en el puerto 3001');

  try {
    // Pruebas 1: Comprobación de Estado (Healthcheck)
    console.log('Test 1: Healthcheck...');
    const resHealth = await request('GET', '/api/v1/health');
    assert.strictEqual(resHealth.status, 200);

    // Login previo para obtener JWT Token
    console.log('Login de prueba como Esteban Reniero (estren@correo.com)...');
    const resLogin = await request('POST', '/api/v1/auth/login', {
      usuario: 'estren@correo.com',
      contrasenia: 'estren'
    });
    assert.strictEqual(resLogin.status, 200);
    const token = resLogin.body.token;
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // Test 2: un Municipal no puede listar técnicos (403)
    console.log('Test 2: Municipal no accede a /usuarios?rol=2...');
    const resEmp = await request('GET', '/api/v1/usuarios?rol=2', null, authHeaders);
    assert.strictEqual(resEmp.status, 403);

    // Pruebas 3: Obtener lista de artículos con paginación
    console.log('Test 3: Lista de artículos con estructura paginada...');
    const resArt = await request('GET', '/api/v1/articulos', null, authHeaders);
    assert.strictEqual(resArt.status, 200);
    const articulos = Array.isArray(resArt.body) ? resArt.body : resArt.body.data;
    assert.strictEqual(Array.isArray(articulos), true);
    if (resArt.body.pagination) {
      assert.strictEqual(typeof resArt.body.pagination.total, 'number');
      assert.strictEqual(resArt.body.pagination.page, 1);
    }

    // Pruebas 4: Crear una incidencia para el usuario Esteban Reniero (ID 4)
    console.log('Test 4: Crear incidencia...');
    const resCreate = await request('POST', '/api/v1/incidencias', {
      id_articulo: 1,
      prioridad: 1,
      descripcion_pedido: 'El mouse sin pilas no funciona'
    }, authHeaders);
    assert.strictEqual(resCreate.status, 201);
    assert.strictEqual(resCreate.body.incidencia.asignado_a, 0, 'Nueva incidencia debe tener asignado_a = 0 (usuario comodín Sin Asignar)');

    // Pruebas 5: Listar incidencias creadas por el usuario autenticado
    console.log('Test 5: Listar mis incidencias con paginación...');
    const resInc = await request('GET', '/api/v1/incidencias', null, authHeaders);
    assert.strictEqual(resInc.status, 200);
    const incidencias = Array.isArray(resInc.body) ? resInc.body : resInc.body.data;
    assert.strictEqual(Array.isArray(incidencias), true);
    if (resInc.body.pagination) {
      assert.strictEqual(typeof resInc.body.pagination.total, 'number');
      assert.strictEqual(resInc.body.pagination.page, 1);
    }

    // Pruebas 6: Cancelar la incidencia creada por el usuario autenticado
    console.log('Test 6: Cancelar incidencia pendiente...');
    const idParaCancelar = resCreate.body.incidencia ? resCreate.body.incidencia.id_incidencia : 1;
    const resCancel = await request('PATCH', `/api/v1/incidencias/${idParaCancelar}`, { id_estado: 4 }, authHeaders);    assert.strictEqual(resCancel.status, 200);

    console.log('\n✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
