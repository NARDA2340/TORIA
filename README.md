# TORIA Studio

Landing-tienda de TORIA Studio: velas, difusores y aromatizantes artesanales.
HTML, CSS y JavaScript puro, sin frameworks. Se despliega en Netlify.

**En vivo:** https://toriastudio.netlify.app

---

## Qué tiene

- Header sticky con logo centrado, navegación por línea de producto, buscador y carrito con contador.
- Hero dividido en dos: bloque terracota con los accesos a cada categoría, y foto.
- Sección "Nosotras".
- Catálogo con tres pestañas, una por línea (Velas / Aromatizantes / Difusores),
  en layout alternado. Dentro de cada línea los productos se agrupan por tamaño.
- Carrito lateral con cantidades, cupones y totales, que se guarda en el navegador.
- Dos formas de cerrar la compra: Mercado Pago o WhatsApp.

---

## Estructura de archivos

```
public/                       Todo lo que se publica
  index.html                  Estructura de la página
  style.css                   Estilos (tokens de marca arriba de todo)
  data/
    products.json             ⭐ PRECIOS Y PRODUCTOS — se edita solo acá
  js/
    main.js                   Arranque y conexión de eventos
    datos.js                  Carga del catálogo y formato de precios
    carrito.js                Estado del carrito y localStorage
    carrito-ui.js             Dibujo del carrito lateral
    catalogo.js               Filas de producto, pestañas y buscador
    checkout.js               Mercado Pago y armado del mensaje de WhatsApp
    ui.js                     Menú, buscador, drawer, foco y avisos
  media/
    LEEME.txt                 Qué foto va en cada nombre de archivo

netlify/functions/
  create-preference.js        Backend de Mercado Pago (crea el link de pago)

netlify.toml                  Configuración de despliegue
package.json                  Dependencia del SDK de Mercado Pago
```

---

## Cómo cambiar precios, productos y cupones

Todo está en **`public/data/products.json`**. Es el único lugar.

Ese mismo archivo lo lee la web *y* el backend que cobra, así que no hay forma
de que el precio que se muestra y el que se cobra queden distintos.

**Para cambiar un precio**, buscá el producto y editá el número:

```json
"precio": 35000,
```

Sin puntos, sin comas, sin signo peso: `35000`, no `$35.000`.

**Para agregar un producto**, copiá un bloque entero y cambiale los datos:

| Campo | Qué es |
|---|---|
| `id` | Único, en minúsculas con guiones (`vela-nueva`). Define el nombre del archivo de foto. |
| `linea` | En qué pestaña aparece: `velas`, `aromatizantes` o `difusores`. |
| `peso` | Agrupa dentro de la pestaña. Los de igual peso quedan juntos. |
| `familia` | La etiqueta que se ve sobre la foto (`Cítrica`, `Amaderada`…). |
| `aroma` | Las notas, tal como están impresas en la etiqueta del frasco. |
| `gradiente` | Color de respaldo si falta la foto: `warm`, `wood`, `citrus`, `cherry`, `spice`, `coast`, `fresh`, `exotic`, `tropical`, `grape`. |

Las líneas `aromatizantes` y `difusores` existen pero todavía no tienen
productos: su pestaña muestra un bloque "en preparación" con un link a WhatsApp.
En cuanto cargues el primero, el bloque desaparece solo.

**Para cambiar los cupones:**

```json
"cupones": {
  "TORIA10": { "descuento": 10, "descripcion": "10% de descuento" }
}
```

El `descuento` es el porcentaje. Para desactivar un cupón, borrá su bloque.

> ⚠️ **Los cupones son públicos.** Están en un archivo que cualquiera puede
> abrir mirando el código fuente de la página. Para descuentos chicos y
> promociones abiertas está perfecto. Si algún día querés un cupón secreto
> de verdad (por ejemplo 50% para una clienta puntual), avisame y lo movemos
> al backend, donde no se puede leer.

---

## Las fotos

Están todas en `public/media/`, redimensionadas a 900px de ancho y por debajo
de 250 KB cada una. Los detalles y los nombres exactos están en
`public/media/LEEME.txt`.

Si agregás un producto nuevo, la foto va con el mismo nombre que su `id`
(por ejemplo `media/vela-nueva.jpg`). Mientras el archivo no exista, la web
muestra el degradado de respaldo y no se rompe nada.

---

## Probarlo en tu compu

```bash
python3 -m http.server 8000 --directory public
```

Y abrís http://localhost:8000

Ojo: tiene que ser con un servidor, no abriendo el `index.html` con doble clic.
El JavaScript usa módulos y el navegador los bloquea si el archivo se abre
directo desde el disco.

Con este método el carrito funciona completo, pero el botón "Finalizar compra"
no, porque la función de Mercado Pago no está corriendo. Para probar eso también,
instalá la CLI de Netlify (`npm install -g netlify-cli`) y corré `netlify dev`.

---

# Mercado Pago, paso a paso

Esta es la parte más larga, pero se hace una sola vez.

## Por qué hay un "backend"

Cobrar necesita una **credencial secreta** de tu cuenta de Mercado Pago.
Si esa credencial estuviera en el código de la página, cualquiera que apriete
"ver código fuente" la podría ver y operar sobre tu cuenta.

Por eso hay un archivo aparte (`netlify/functions/create-preference.js`) que
corre **en el servidor de Netlify**, donde nadie puede ver el código. La página
le pide a ese archivo "armame el link de pago", y el archivo se lo devuelve.

De paso, ese archivo también **recalcula los precios** desde el catálogo. El
navegador solo manda qué productos y cuántos, nunca cuánto salen. Si alguien
intentara editar los precios desde la consola del navegador, no le serviría de
nada: el servidor los ignora y usa los suyos.

## Paso 1 — Crear la cuenta

Si ya usás Mercado Pago para cobrar, **esa cuenta sirve**, no hace falta otra.

Si no, entrá a https://www.mercadopago.com.ar y creá una cuenta. Para cobrar de
verdad vas a tener que completar los datos fiscales (CUIT o CUIL) y una cuenta
bancaria donde te depositen. Eso te lo va pidiendo Mercado Pago solo.

## Paso 2 — Crear la "aplicación"

Las credenciales no se sacan de la cuenta común, sino del panel de
desarrolladores. Es gratis y no cambia nada de tu cuenta.

1. Entrá a https://www.mercadopago.com.ar/developers/panel con tu cuenta
2. **Tus integraciones** → **Crear aplicación**
3. Ponele un nombre (por ejemplo, `TORIA Studio`)
4. Cuando pregunte qué producto vas a integrar, elegí **Checkout Pro**
5. Guardá

## Paso 3 — Sacar el Access Token

Dentro de la aplicación que creaste vas a ver, en el menú de la izquierda,
**Credenciales de producción** y **Credenciales de prueba**. Son dos juegos
distintos y es importante no mezclarlos:

| | Para qué sirve | Cómo empieza |
|---|---|---|
| **Credenciales de prueba** | Probar sin mover un peso real | `TEST-...` |
| **Credenciales de producción** | Cobrar de verdad | `APP_USR-...` |

De cada una hay dos valores: **Public Key** y **Access Token**.

**Vos necesitás solo el Access Token.** La Public Key no se usa en esta
integración, porque el checkout se abre en el sitio de Mercado Pago.

Empezá copiando el **Access Token de prueba**.

> 🔒 El Access Token es como la llave de tu caja. No lo pegues en un chat, no lo
> subas a GitHub, no se lo mandes a nadie. Si se te escapa, entrá al panel y
> generá uno nuevo: el viejo deja de funcionar.

## Paso 4 — Cargar la credencial en Netlify

1. Entrá a tu proyecto en https://app.netlify.com
2. **Site configuration** → **Environment variables**
3. **Add a variable** → **Add a single variable**
4. Completá:
   - **Key:** `MP_ACCESS_TOKEN`
   - **Value:** el Access Token que copiaste
   - **Scopes:** dejá que aplique a todos
5. **Create variable**
6. Andá a **Deploys** → **Trigger deploy** → **Deploy site**

El último paso es necesario: las variables nuevas recién quedan disponibles
después de un despliegue.

## Paso 5 — Probar sin gastar plata

Con el Access Token **de prueba** cargado, el checkout funciona igual pero no
mueve dinero real.

Agregá algo al carrito, tocá "Finalizar compra" y vas a caer en Mercado Pago.
Ahí pagá con una **tarjeta de prueba**:

| Tarjeta | Número | CVV | Vencimiento |
|---|---|---|---|
| Mastercard | 5031 7557 3453 0604 | 123 | 11/30 |
| Visa | 4509 9535 6623 3704 | 123 | 11/30 |

En **nombre del titular** escribí una de estas palabras para elegir qué quería
que pase con el pago:

- `APRO` → el pago se aprueba
- `CONT` → queda pendiente
- `OTHE` → se rechaza

En **documento** poné DNI `12345678`.

> Estos números los publica Mercado Pago y los actualiza cada tanto. Si alguno
> no anda, la lista al día está en
> https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards

Probá al menos un `APRO` y un `OTHE`, para ver que en los dos casos la clienta
vuelve al sitio.

## Paso 6 — Pasar a cobrar de verdad

Cuando estés conforme:

1. Volvé al panel de Mercado Pago y copiá el **Access Token de producción** (`APP_USR-...`)
2. En Netlify, editá la variable `MP_ACCESS_TOKEN` y reemplazá el valor
3. Volvé a desplegar (**Trigger deploy**)
4. **Hacé una compra real tuya, del producto más barato.** Es la única forma de
   estar segura. Después la cancelás desde tu panel de Mercado Pago y te
   devuelven la plata.

A partir de ahí, cada venta te aparece en tu cuenta de Mercado Pago como
cualquier otro cobro.

## Si algo falla

| Qué ves | Qué pasa | Cómo se arregla |
|---|---|---|
| "El pago online todavía no está configurado" | Falta la variable `MP_ACCESS_TOKEN` | Paso 4 |
| "El pago online todavía no está disponible" | La función no está desplegada | Revisá que el deploy haya terminado bien |
| "No pudimos generar el link de pago" | Mercado Pago rechazó el pedido | Mirá el log: Netlify → **Functions** → `create-preference` |

El log de la función es el mejor lugar para entender qué pasó: ahí queda escrito
el error exacto que devolvió Mercado Pago.

---

## Cómo sería en Vercel

La lógica es idéntica; cambia el formato del archivo y dónde se pone.

**1.** Creá `api/create-preference.js` en la raíz del proyecto (Vercel toma
como función todo lo que esté en `api/`):

```js
const { MercadoPagoConfig, Preference } = require('mercadopago');
const catalogo = require('../public/data/products.json');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: 'Falta configurar el pago.' });
  }

  // req.body ya viene parseado en Vercel; en Netlify hay que hacer JSON.parse.
  const { items: recibidos = [], cupon } = req.body || {};

  // ... misma validación contra el catálogo que en la versión de Netlify ...

  const cliente = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(cliente);
  const resultado = await preference.create({ body: { items: itemsMP } });

  return res.status(200).json({ init_point: resultado.init_point });
};
```

**Las tres diferencias con Netlify:**

| | Netlify | Vercel |
|---|---|---|
| Dónde va el archivo | `netlify/functions/` | `api/` |
| Cómo se exporta | `exports.handler = async (event) => {}` | `module.exports = async (req, res) => {}` |
| Cómo se responde | `return { statusCode, body }` | `res.status(200).json({...})` |
| Cómo lee el cuerpo | `JSON.parse(event.body)` | `req.body` (ya parseado) |
| URL que queda | `/.netlify/functions/create-preference` | `/api/create-preference` |

**2.** En `public/js/checkout.js`, cambiá la constante `ENDPOINT`:

```js
const ENDPOINT = '/api/create-preference';
```

**3.** La variable de entorno se carga en **Project Settings → Environment
Variables**, con el mismo nombre `MP_ACCESS_TOKEN`. También hay que redesplegar.

---

## Pendientes antes de difundir el link

- [ ] **Access Token de Mercado Pago.** Es lo único que falta para poder cobrar
      online. Ver la guía de más arriba.
- [ ] **Foto de ustedes dos.** La sección "Nosotras" usa hoy `media/nosotras.jpg`,
      que es una foto de producto, no de ustedes. El texto habla de dos hermanas,
      así que una foto de las dos en el taller cerraría mucho mejor.
- [ ] **Costo de envío.** Hoy el checkout cobra solo los productos; el envío se
      coordina aparte por WhatsApp. Si querés cobrarlo junto, se puede agregar.
- [ ] **Aromatizantes y difusores.** Las dos pestañas están armadas y vacías.
      Cuando tengas fotos y precios, se cargan en `products.json` y aparecen solas.
- [ ] **Reseñas.** La sección está sacada porque los testimonios del borrador
      eran inventados. Los estilos siguen disponibles para rearmarla con reseñas reales.

## Hecho

- [x] Fotos de los diez productos, hero, "Nosotras" y la imagen para compartir.
- [x] Notas de aroma transcriptas de las etiquetas de los frascos (ya no hay
      ninguna inferida).
- [x] Precios por tamaño: 180 g a $35.000 y 200 g a $45.000.
