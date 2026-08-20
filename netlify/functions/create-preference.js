/**
 * create-preference.js — Netlify Function
 *
 * Crea una "preference" de Mercado Pago (Checkout Pro) y devuelve el link
 * de pago (init_point) para que el navegador redirija a la clienta.
 *
 * POR QUÉ ESTO TIENE QUE SER BACKEND
 * ----------------------------------
 * Dos motivos:
 *
 * 1. El Access Token es secreto. Si estuviera en el JavaScript del navegador,
 *    cualquiera podría verlo y operar sobre tu cuenta de Mercado Pago.
 *    Por eso se lee de una variable de entorno y NUNCA se escribe en el código.
 *
 * 2. Los precios los pone el servidor. El navegador manda solamente ids y
 *    cantidades. Si confiáramos en el precio que manda el navegador, alguien
 *    podría abrir la consola y comprar una vela de $35.000 por $1.
 *
 * Variable de entorno necesaria: MP_ACCESS_TOKEN  (ver README)
 */

const { MercadoPagoConfig, Preference } = require('mercadopago');

// El catálogo se importa del mismo archivo que usa la web.
// El bundler de Netlify lo incluye solo en el paquete de la función.
const catalogo = require('../../public/data/products.json');

/** Mismo tope que en el front (public/js/carrito.js). */
const CANTIDAD_MAX = 6;

/** Respuesta JSON con los headers correctos. */
function json(statusCode, cuerpo) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  };
}

/** Redondea a 2 decimales (Mercado Pago trabaja con centavos). */
function redondear(n) {
  return Math.round(n * 100) / 100;
}

exports.handler = async (event) => {
  /* ---------- 1. Solo aceptamos POST ---------- */
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método no permitido.' });
  }

  /* ---------- 2. El token tiene que estar configurado ---------- */
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('Falta la variable de entorno MP_ACCESS_TOKEN.');
    return json(500, {
      error: 'El pago online todavía no está configurado. Escribinos por WhatsApp y lo coordinamos.',
    });
  }

  /* ---------- 3. Leemos el pedido ---------- */
  let pedido;
  try {
    pedido = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'No pudimos leer el pedido.' });
  }

  const recibidos = Array.isArray(pedido.items) ? pedido.items : [];
  if (recibidos.length === 0) {
    return json(400, { error: 'El carrito está vacío.' });
  }

  /* ---------- 4. Validamos contra el catálogo real ---------- */
  // Acá está la parte importante: reconstruimos el pedido desde cero
  // usando SOLO los precios de products.json.
  const items = [];

  for (const recibido of recibidos) {
    const producto = catalogo.productos.find((p) => p.id === recibido.id);
    if (!producto) {
      return json(400, { error: `El producto "${recibido.id}" ya no está disponible.` });
    }

    const cantidad = Math.floor(Number(recibido.cantidad));
    if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAX) {
      return json(400, { error: `Cantidad inválida para ${producto.nombre}.` });
    }

    items.push({ producto, cantidad });
  }

  /* ---------- 5. Cupón: se vuelve a validar del lado del servidor ---------- */
  let porcentajeDescuento = 0;
  let codigoCupon = null;

  if (pedido.cupon) {
    const codigo = String(pedido.cupon).trim().toUpperCase();
    const cupon = catalogo.cupones[codigo];

    // Un cupón inexistente no rompe la compra: simplemente no se aplica.
    if (cupon) {
      porcentajeDescuento = cupon.descuento;
      codigoCupon = codigo;
    }
  }

  /* ---------- 6. Armamos los items de Mercado Pago ---------- */
  const factor = 1 - porcentajeDescuento / 100;

  const itemsMP = items.map(({ producto, cantidad }) => ({
    id: producto.id,
    title: producto.nombre,
    description: producto.aroma,
    category_id: 'home_decor',
    quantity: cantidad,
    currency_id: catalogo.moneda || 'ARS',
    unit_price: redondear(producto.precio * factor),
  }));

  /* ---------- 7. A dónde vuelve la clienta después de pagar ---------- */
  // process.env.URL lo define Netlify con la URL del sitio.
  const sitio =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    event.headers.origin ||
    '';

  /* ---------- 8. Creamos la preference ---------- */
  try {
    const cliente = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(cliente);

    const resultado = await preference.create({
      body: {
        items: itemsMP,
        statement_descriptor: 'TORIA STUDIO',
        external_reference: codigoCupon ? `cupon:${codigoCupon}` : undefined,
        back_urls: sitio
          ? {
              success: `${sitio}/?pago=exito`,
              pending: `${sitio}/?pago=pendiente`,
              failure: `${sitio}/?pago=error`,
            }
          : undefined,
        // Vuelve sola al sitio cuando el pago se aprueba.
        auto_return: sitio ? 'approved' : undefined,
      },
    });

    return json(200, {
      id: resultado.id,
      init_point: resultado.init_point,
      // Con credenciales de prueba, este es el link del entorno sandbox.
      sandbox_init_point: resultado.sandbox_init_point,
    });
  } catch (error) {
    console.error('Error creando la preference de Mercado Pago:', error);
    return json(502, {
      error: 'No pudimos generar el link de pago. Probá de nuevo o pedí por WhatsApp.',
    });
  }
};
