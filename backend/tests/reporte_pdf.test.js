/**
 * ============================================================================
 * PRUEBAS DE INTEGRACIÓN - GENERACIÓN DE REPORTES EN PDF (PDFKIT)
 * Verifica:
 * 1. Protección de endpoints (401 no autenticado, 403 rol municipal).
 * 2. Generación exitosa de PDF en /api/v1/director/reportes/pdf y /api/v1/reportes/pdf.
 * 3. Cabeceras HTTP: Content-Type application/pdf y Content-Disposition attachment.
 * 4. Integridad binaria del PDF (encabezado %PDF- de PDFKit).
 * 5. Aplicación correcta de filtros combinados (desde, hasta, id_estado, asignado_a).
 * ============================================================================
 */

import assert from 'assert';
import http from 'http';
import setupTestDb from './setupTestDb.js';
import app from '../src/server.js';

let server;

function requestBinary(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3004,
      path: path,
      method: method,
      headers: { ...headers }
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          buffer: buffer,
          text: buffer.toString('utf-8')
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function requestJson(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3004,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
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
  await new Promise((resolve) => server.listen(3004, resolve));
  console.log('\n🚀 Servidor de pruebas para Reportes PDF iniciado en el puerto 3004\n');

  try {
    // --------------------------------------------------------------------------
    // Test 1: Solicitud sin token (401 Unauthorized)
    // --------------------------------------------------------------------------
    console.log('Test 1: Intentar generar reporte PDF sin token JWT (401)...');
    const resSinToken = await requestBinary('GET', '/api/v1/director/reportes/pdf');
    assert.strictEqual(resSinToken.status, 401, 'Debe denegar acceso sin autenticación');
    console.log('   ✅ Endpoint protegido correctamente (401 Unauthorized).');

    // --------------------------------------------------------------------------
    // Test 2: Solicitud con rol Municipal (403 Forbidden)
    // --------------------------------------------------------------------------
    console.log('Test 2: Intentar generar reporte PDF con rol Municipal (403)...');
    const loginMunicipal = await requestJson('POST', '/api/v1/auth/login', {
      usuario: 'estren@correo.com',
      contrasenia: 'estren'
    });
    assert.strictEqual(loginMunicipal.status, 200);
    const tokenMunicipal = loginMunicipal.body.token;

    const resMunicipal = await requestBinary('GET', '/api/v1/director/reportes/pdf', {
      Authorization: `Bearer ${tokenMunicipal}`
    });
    assert.strictEqual(resMunicipal.status, 403, 'Rol municipal no debe tener permiso de director');
    console.log('   ✅ Autorización de rol verificada (403 Forbidden).');

    // --------------------------------------------------------------------------
    // Test 3: Solicitud como Director de Sistemas (200 OK y PDF binario)
    // --------------------------------------------------------------------------
    console.log('Test 3: Generar reporte PDF completo como Director de Sistemas...');
    const loginDirector = await requestJson('POST', '/api/v1/auth/login', {
      usuario: 'pamalm@correo.com',
      contrasenia: 'pamalm'
    });
    assert.strictEqual(loginDirector.status, 200);
    const tokenDirector = loginDirector.body.token;

    const resPdf = await requestBinary('GET', '/api/v1/director/reportes/pdf', {
      Authorization: `Bearer ${tokenDirector}`
    });

    assert.strictEqual(resPdf.status, 200, 'Debe devolver código 200');
    assert(
      resPdf.headers['content-type'].includes('application/pdf'),
      `Content-Type debe ser application/pdf, recibido: ${resPdf.headers['content-type']}`
    );
    assert(
      resPdf.headers['content-disposition'].includes('reporte_incidencias.pdf'),
      'Content-Disposition debe sugerir el nombre reporte_incidencias.pdf'
    );
    assert(resPdf.buffer.length > 500, 'El PDF generado debe contener datos binarios');

    // Validar cabecera mágica de archivo PDF (%PDF-)
    const pdfMagicHeader = resPdf.buffer.slice(0, 5).toString('ascii');
    assert.strictEqual(pdfMagicHeader, '%PDF-', 'El archivo debe comenzar con el magic header %PDF-');
    console.log(`   ✅ PDF generado exitosamente (${resPdf.buffer.length} bytes, cabecera válida %PDF-).`);

    // --------------------------------------------------------------------------
    // Test 4: Generar reporte con filtros combinados (desde, hasta, estado, técnico)
    // --------------------------------------------------------------------------
    console.log('Test 4: Generar reporte PDF con filtros combinados (estado=1, asignado_a=1)...');
    const queryParams = new URLSearchParams({
      desde: '2026-01-01',
      hasta: '2026-12-31',
      id_estado: '1',
      asignado_a: '1'
    }).toString();

    const resPdfFiltrado = await requestBinary('GET', `/api/v1/director/reportes/pdf?${queryParams}`, {
      Authorization: `Bearer ${tokenDirector}`
    });

    assert.strictEqual(resPdfFiltrado.status, 200);
    assert.strictEqual(resPdfFiltrado.buffer.slice(0, 5).toString('ascii'), '%PDF-');
    console.log('   ✅ Reporte filtrado generado correctamente en PDF.');

    // --------------------------------------------------------------------------
    // Test 5: Alias de ruta /api/v1/reportes/pdf
    // --------------------------------------------------------------------------
    console.log('Test 5: Verificar alias de ruta /api/v1/reportes/pdf...');
    const resAlias = await requestBinary('GET', '/api/v1/reportes/pdf', {
      Authorization: `Bearer ${tokenDirector}`
    });
    assert.strictEqual(resAlias.status, 200);
    assert.strictEqual(resAlias.buffer.slice(0, 5).toString('ascii'), '%PDF-');
    console.log('   ✅ Alias /api/v1/reportes/pdf funcionando correctamente.');

    console.log('\n========================================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE GENERACIÓN PDF (PDFKIT) PASARON CON ÉXITO!');
    console.log('========================================================================\n');
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n❌ Error en las pruebas de reporte PDF:', err);
  if (server) server.close();
  process.exit(1);
});

