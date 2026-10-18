/**
 * ============================================================================
 * PRUEBAS DE INTEGRACIÓN DE LA API REST - MÓDULO DE EMPLEADOS
 * Ejecución de pruebas automatizadas sobre el servidor de pruebas HTTP.
 * ============================================================================
 */

const assert = require('assert');
const http = require('http');
const app = require('../src/server');

let server;

/**
 * Función auxiliar para realizar peticiones HTTP durante las pruebas.
 * @param {string} method - Método HTTP (GET, POST, PUT, DELETE).
 * @param {string} path - Ruta/Endpoint a consultar.
 * @param {Object|null} body - Cuerpo de la solicitud en formato JS object.
 * @returns {Promise<Object>} Promesa con el código de estado y el cuerpo parsed de la respuesta.
 */
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
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

/**
 * Función principal que ejecuta la suite completa de pruebas de endpoints.
 */
async function runTests() {
  server = http.createServer(app);
  await new Promise(resolve => server.listen(3001, resolve));
  console.log('Servidor de pruebas escuchando en el puerto 3001');

  try {
    // Pruebas 1: Comprobación de Estado (Healthcheck)
    console.log('Test 1: Healthcheck...');
    const resHealth = await request('GET', '/api/v1/health');
    assert.strictEqual(resHealth.status, 200);

    // Pruebas 2: Obtener lista de empleados
    console.log('Test 2: Lista de empleados...');
    const resEmp = await request('GET', '/api/v1/usuarios/empleados');
    assert.strictEqual(resEmp.status, 200);
    assert.strictEqual(Array.isArray(resEmp.body), true);

    // Pruebas 3: Obtener lista de artículos
    console.log('Test 3: Lista de artículos...');
    const resArt = await request('GET', '/api/v1/articulos');
    assert.strictEqual(resArt.status, 200);
    assert.strictEqual(Array.isArray(resArt.body), true);

    // Pruebas 4: Crear una incidencia para el usuario Esteban Reniero (ID 4)
    console.log('Test 4: Crear incidencia...');
    const resCreate = await request('POST', '/api/v1/incidencias', {
      id_articulo: 1,
      creado_por: 4,
      prioridad: 1,
      descripcion_pedido: 'El mouse sin pilas no funciona'
    });
    assert.strictEqual(resCreate.status, 201);

    // Pruebas 5: Listar incidencias creadas por el usuario ID 4
    console.log('Test 5: Listar mis incidencias...');
    const resInc = await request('GET', '/api/v1/incidencias/mis-incidencias?id_usuario=4');
    assert.strictEqual(resInc.status, 200);
    assert.strictEqual(Array.isArray(resInc.body), true);

    // Pruebas 6: Cancelar la incidencia creada por el usuario ID 4
    console.log('Test 6: Cancelar incidencia pendiente...');
    const idParaCancelar = resCreate.body.incidencia ? resCreate.body.incidencia.id_incidencia : 1;
    const resCancel = await request('PUT', `/api/v1/incidencias/${idParaCancelar}/cancelar`, { id_usuario: 4 });
    assert.strictEqual(resCancel.status, 200);

    console.log('\n✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE CON LA NUEVA BASE DE DATOS!');
  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
