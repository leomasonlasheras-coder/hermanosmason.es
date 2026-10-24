/* ==========================================================================
   ESCUCHA DE TEMAS (temas/escucha.js) · lo lleva la web de cada cliente

   Permite que el editor del panel (panel.hermanosmason.es) enseñe la web
   del cliente dentro de un iframe y le cambie el tema en directo, sin
   recargar. Fuera de un iframe no hace nada; dentro, solo obedece a los
   orígenes de la lista PERMITIDOS (y, si la propia web está en local, a
   otro origen local: así se prueba el editor en esta máquina).

   La web tiene que llevar en el <head> el enlace al tema con id="tema":

     <link id="tema" rel="stylesheet"
           href="https://hermanosmason.es/temas/clientes/nacar.css"
           data-catalogo="https://hermanosmason.es/temas/">

   data-catalogo es la carpeta donde están los temas sueltos (<slug>.css).
   Si falta, se usa la carpeta del propio href (las webs de exposición
   enlazan ../comun/temas/sereno.css y no lo necesitan).

   Mensajes que entiende (event.data es un objeto con "tipo"):
     { tipo: "tema", slug: "calido" }  aplica ese tema del catálogo.
     { tipo: "tema-hola" }             pide el saludo de abajo.
   Mensajes que manda al padre:
     { tipo: "tema-listo", slug }      al arrancar (al origen del referrer,
                                       si está permitido) y al recibir
                                       tema-hola: "estoy aquí y llevo este".
     { tipo: "tema-aplicado", slug }   cuando el CSS nuevo ha cargado.
     { tipo: "tema-error", slug }      si ese CSS no existe.

   El cambio no parpadea: se añade un <link> nuevo detrás del actual y, solo
   cuando ha cargado, se quita el viejo. Si llegan varios cambios seguidos
   (pasar deprisa por la lista), solo el último se queda (24-10-2026).
   ========================================================================== */

(function () {
  "use strict";

  if (window.parent === window) return;

  var link = document.getElementById("tema");
  if (!link) return;

  var PERMITIDOS = ["https://panel.hermanosmason.es", "https://hermanosmason.es"];
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/;
  var SLUG = /^[a-z0-9-]+$/;

  function hostDe(origen) {
    try { return new URL(origen).hostname; } catch (e) { return ""; }
  }

  function origenPermitido(origen) {
    if (PERMITIDOS.indexOf(origen) !== -1) return true;
    return LOCAL.test(location.hostname) && LOCAL.test(hostDe(origen));
  }

  function catalogo() {
    if (link.dataset.catalogo) return link.dataset.catalogo;
    return link.href.replace(/[^\/]*$/, "");
  }

  function slugActual() {
    var m = link.href.match(/([a-z0-9-]+)\.css(\?.*)?$/);
    return m ? m[1] : "";
  }

  function decir(mensaje, origen) {
    window.parent.postMessage(mensaje, origen);
  }

  var pedido = 0;

  function aplicar(slug, origen) {
    var mio = ++pedido;
    var nuevo = document.createElement("link");
    nuevo.rel = "stylesheet";
    nuevo.href = catalogo() + slug + ".css";
    if (link.dataset.catalogo) nuevo.dataset.catalogo = link.dataset.catalogo;
    nuevo.onload = function () {
      if (mio !== pedido) { nuevo.remove(); return; }
      var viejo = link;
      link = nuevo;
      nuevo.id = "tema";
      viejo.remove();
      decir({ tipo: "tema-aplicado", slug: slug }, origen);
    };
    nuevo.onerror = function () {
      nuevo.remove();
      decir({ tipo: "tema-error", slug: slug }, origen);
    };
    link.after(nuevo);
  }

  window.addEventListener("message", function (event) {
    if (!origenPermitido(event.origin)) return;
    var datos = event.data;
    if (!datos || typeof datos !== "object") return;
    if (datos.tipo === "tema-hola") {
      decir({ tipo: "tema-listo", slug: slugActual() }, event.origin);
    } else if (datos.tipo === "tema" && typeof datos.slug === "string" && SLUG.test(datos.slug)) {
      aplicar(datos.slug, event.origin);
    }
  });

  /* El saludo al arrancar: solo si sabemos quién nos tiene dentro (el
     referrer) y está permitido. Si el referrer no llega (política del
     navegador), el editor manda tema-hola y se contesta igual. */
  var referrer = "";
  try { referrer = new URL(document.referrer).origin; } catch (e) {}
  if (referrer && origenPermitido(referrer)) {
    decir({ tipo: "tema-listo", slug: slugActual() }, referrer);
  }
})();
