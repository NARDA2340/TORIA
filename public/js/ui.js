/**
 * ui.js — comportamiento de la interfaz
 *
 * Se ocupa de: menú mobile, buscador desplegable, apertura y cierre del
 * drawer del carrito (con manejo de foco), avisos flotantes y el respaldo
 * de imágenes que todavía no existen.
 */

/** Elemento que tenía el foco antes de abrir el carrito, para devolvérselo al cerrar. */
let focoPrevio = null;

/* ---------------------------------------------------------
   Imágenes opcionales
   --------------------------------------------------------- */

/**
 * Mientras no estén las fotos reales en media/, los <img> dan 404.
 * En vez de mostrar el ícono de imagen rota, los ocultamos y dejamos
 * ver el degradado de respaldo que ya está en el CSS.
 */
export function prepararImagenes() {
  document.querySelectorAll('[data-img-opcional]').forEach((img) => {
    // Si ya terminó de cargar y no tiene dimensiones, falló.
    if (img.complete && img.naturalWidth === 0) {
      img.classList.add('oculta');
    }
    img.addEventListener('error', () => img.classList.add('oculta'));
  });
}

/* ---------------------------------------------------------
   Menú mobile
   --------------------------------------------------------- */

export function alternarMenu(forzar) {
  const btn = document.querySelector('[data-accion="abrir-menu"]');
  const menu = document.getElementById('menu-mobile');
  if (!btn || !menu) return;

  const abrir = typeof forzar === 'boolean' ? forzar : menu.hidden;
  menu.hidden = !abrir;
  btn.setAttribute('aria-expanded', String(abrir));
  btn.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
}

/* ---------------------------------------------------------
   Buscador
   --------------------------------------------------------- */

export function alternarBuscador(forzar) {
  const btn = document.querySelector('[data-accion="alternar-buscador"]');
  const caja = document.getElementById('buscador');
  if (!btn || !caja) return;

  const abrir = typeof forzar === 'boolean' ? forzar : caja.hidden;
  caja.hidden = !abrir;
  btn.setAttribute('aria-expanded', String(abrir));

  if (abrir) {
    caja.querySelector('[data-buscador-input]')?.focus();
  }
}

/* ---------------------------------------------------------
   Drawer del carrito
   --------------------------------------------------------- */

export function abrirCarrito() {
  const drawer = document.getElementById('carrito');
  const overlay = document.querySelector('[data-overlay]');
  if (!drawer || !overlay) return;

  focoPrevio = document.activeElement;

  overlay.hidden = false;
  drawer.hidden = false;

  // Un frame de espera para que la transición de CSS arranque desde el estado cerrado.
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
    drawer.classList.add('abierto');
  });

  document.body.classList.add('sin-scroll');
  drawer.querySelector('.carrito__cerrar')?.focus();
}

export function cerrarCarrito() {
  const drawer = document.getElementById('carrito');
  const overlay = document.querySelector('[data-overlay]');
  if (!drawer || !overlay) return;

  drawer.classList.remove('abierto');
  overlay.classList.remove('visible');
  document.body.classList.remove('sin-scroll');

  // Esperamos a que termine la animación para sacarlos del árbol de accesibilidad.
  const ocultar = () => {
    drawer.hidden = true;
    overlay.hidden = true;
  };
  const reduceMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMovimiento) ocultar();
  else setTimeout(ocultar, 280);

  focoPrevio?.focus();
  focoPrevio = null;
}

export function carritoAbierto() {
  return document.getElementById('carrito')?.classList.contains('abierto') ?? false;
}

/**
 * Mantiene el foco dentro del drawer mientras está abierto (Tab y Shift+Tab
 * dan la vuelta en vez de escaparse al fondo de la página).
 * @param {KeyboardEvent} e
 */
export function atraparFoco(e) {
  if (e.key !== 'Tab' || !carritoAbierto()) return;

  const drawer = document.getElementById('carrito');
  const focusables = drawer.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return;

  const primero = focusables[0];
  const ultimo = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === primero) {
    e.preventDefault();
    ultimo.focus();
  } else if (!e.shiftKey && document.activeElement === ultimo) {
    e.preventDefault();
    primero.focus();
  }
}

/* ---------------------------------------------------------
   Avisos flotantes
   --------------------------------------------------------- */

let avisoTimer = null;

/**
 * Muestra un mensaje breve abajo de la pantalla ("Agregaste X al carrito").
 * @param {string} texto
 */
export function mostrarAviso(texto) {
  const aviso = document.querySelector('[data-aviso]');
  if (!aviso) return;

  aviso.textContent = texto;
  aviso.hidden = false;
  requestAnimationFrame(() => aviso.classList.add('visible'));

  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => {
    aviso.classList.remove('visible');
    setTimeout(() => { aviso.hidden = true; }, 220);
  }, 2400);
}

/** Animación del contador del carrito cuando se agrega algo. */
export function latirContador() {
  const btn = document.querySelector('.icono-btn--carrito');
  if (!btn) return;
  btn.classList.remove('late');
  void btn.offsetWidth; // fuerza el reinicio de la animación
  btn.classList.add('late');
}
