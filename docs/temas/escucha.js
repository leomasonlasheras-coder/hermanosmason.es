/* ==========================================================================
   ESCUCHA DE TEMAS (temas/escucha.js) · lo lleva la web de cada cliente

   Permite que el editor del panel (panel.hermanosmason.es) enseñe la web
   del cliente dentro de un iframe y le cambie el tema en directo, sin
   recargar. Fuera de un iframe no hace nada; dentro, solo obedece a los
   orígenes de la lista PERMITIDOS (y, si la propia web está en local, a
   otro origen local: así se prueba el editor en esta máquina).

   Si la dirección lleva ?mapa (el minimapa del editor), pone la clase
   "mapa" en <html> y fija --ventana (=?ventana, 800px por defecto): las
   webs usan --ventana donde usarían svh, y con la clase se quedan quietas.

   La web tiene que llevar en el <head> el enlace al tema con id="tema":

     <link id="tema" rel="stylesheet"
           href="https://hermanosmason.es/temas/clientes/nacar.css"
           data-catalogo="https://hermanosmason.es/temas/">

   data-catalogo es la carpeta donde están los temas sueltos (<slug>.css).
   Si falta, se usa la carpeta del propio href (las webs de exposición
   enlazan ../comun/temas/sereno.css y no lo necesitan).

   Mensajes que entiende (event.data es un objeto con "tipo"):
     { tipo: "tema", slug: "calido", archivos: [...] }  aplica ese tema del
                                       catálogo, con fundido; archivos son
                                       sus letras (familia, archivo relativo
                                       a la carpeta de temas, peso, estilo,
                                       ancho) para precargarlas antes.
     { tipo: "tema-hola" }             pide el saludo de abajo.
     { tipo: "desplazar", dy: 120 }    baja (o sube) esos píxeles: el editor
                                       recoge la rueda sobre el mockup.
     { tipo: "arriba" }                vuelve al principio.
     { tipo: "vistazo" }               baja un poco y vuelve (enseña que se
                                       puede recorrer).
     { tipo: "ir-y", y }               a esa altura de la página (desde el
                                       minimapa del editor).
     { tipo: "ir-seccion", indice, progreso, fraccion }  colocarse en esa
                                       sección con ese avance (coordina el
                                       móvil y el ordenador); sin secciones,
                                       en esa fracción de la página.
   Y, mientras está dentro del editor, le dice por dónde va al hacer scroll:
     { tipo: "posicion", fraccion, visible, alto, ventana, seccion, progreso, eco }
                                       fracción recorrida (0 a 1), qué parte
                                       de la página cabe en la ventana, el
                                       alto de la página y de la ventana, en
                                       qué <section> de <main> está y cuánto
                                       lleva de ella; eco=true si el scroll lo
                                       provocó el propio editor (ir-seccion o
                                       vistazo), para que no lo rebote.
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

  /* ?mapa=1&ventana=800: la web está en el minimapa del editor, pintada
     entera en un iframe tan alto como la página. Ahí 100svh sería la
     página entera, así que las webs usan --ventana en vez de svh y aquí se
     fija al alto de la ventana de verdad (25-10-2026). */
  var params = new URLSearchParams(location.search);
  if (params.has("mapa")) {
    var ventana = parseInt(params.get("ventana"), 10) || 800;
    document.documentElement.style.setProperty("--ventana", ventana + "px");
    document.documentElement.classList.add("mapa");
  }

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

  /* Dentro del editor la web se recorre con la rueda desde fuera, así que
     su barra de scroll sobra en el mockup. Se esconde una sola vez, al
     primer mensaje válido o al saludo (solo cuando nos tiene un origen
     permitido). */
  var sinBarra = false;
  function esconderBarra() {
    if (sinBarra) return;
    sinBarra = true;
    var s = document.createElement("style");
    s.textContent = "html{scrollbar-width:none}html::-webkit-scrollbar{display:none}";
    document.head.appendChild(s);
    // La clase "editor" en <html>: la web puede acortar sus entradas y
    // efectos dentro del editor (al saltar por el minimapa, una cortina de
    // segundo y medio parece que la foto no carga).
    document.documentElement.classList.add("editor");
  }

  /* El cambio de tema, con fundido (25-10-2026): la hoja nueva se carga
     sin aplicarla (media="not all"), se precargan sus letras (el editor
     manda la lista) y, cuando está todo, se aplica y se retira la vieja en
     el mismo instante dentro de una transición de vista: la página funde
     de la vieja a la nueva en 0,35 s. Sin transiciones de vista (navegador
     viejo), movimiento reducido o en el minimapa, el cambio es un corte. */
  var REDUCIDO = window.matchMedia("(prefers-reduced-motion: reduce)");
  var estiloFundido = false;

  function prepararFundido() {
    if (estiloFundido) return;
    estiloFundido = true;
    var s = document.createElement("style");
    s.textContent = "::view-transition-old(root),::view-transition-new(root){animation-duration:.35s;animation-timing-function:ease-in-out}";
    document.head.appendChild(s);
  }

  function precargarLetras(archivos) {
    if (!archivos || !archivos.length || !window.FontFace) return Promise.resolve();
    var base = catalogo();
    var cargas = archivos.map(function (a) {
      try {
        var cara = new FontFace(a.familia, 'url("' + base + a.archivo + '")', {
          weight: String(a.peso || "400"),
          style: a.estilo || "normal",
          stretch: a.ancho || "100%"
        });
        document.fonts.add(cara);
        return cara.load().catch(function () {});
      } catch (e) { return Promise.resolve(); }
    });
    // Como mucho segundo y medio: si una letra tarda, se funde sin ella.
    return Promise.race([Promise.all(cargas), new Promise(function (r) { setTimeout(r, 1500); })]);
  }

  var pendienteLink = null;   // la hoja que está cargando, si hay una

  // Deja una sola hoja de tema: la que se le pasa. Las demás del catálogo
  // (restos de cambios pisados por otros) se quitan.
  function soloEsta(nuevo) {
    var base = catalogo();
    Array.prototype.slice.call(document.querySelectorAll('link[rel="stylesheet"]')).forEach(function (l) {
      if (l !== nuevo && l.href.indexOf(base) === 0) l.remove();
    });
  }

  function aplicar(slug, origen, archivos) {
    var mio = ++pedido;
    // Si había una hoja a medio cargar de un cambio anterior, fuera: solo
    // vale el último que se ha pedido.
    if (pendienteLink) { pendienteLink.remove(); pendienteLink = null; }
    var nuevo = document.createElement("link");
    nuevo.rel = "stylesheet";
    nuevo.media = "not all";
    nuevo.href = catalogo() + slug + ".css";
    if (link.dataset.catalogo) nuevo.dataset.catalogo = link.dataset.catalogo;
    pendienteLink = nuevo;
    nuevo.onload = function () {
      if (mio !== pedido) { nuevo.remove(); return; }
      precargarLetras(archivos).then(function () {
        if (mio !== pedido) { nuevo.remove(); return; }
        var cambiado = false;
        function cambio() {
          // El cambio se comprueba otra vez aquí: una transición de vista
          // puede llamar tarde, cuando ya hay otro cambio pedido, y antes
          // dejaba dos hojas aplicadas a la vez (25-10-2026).
          if (cambiado || mio !== pedido) return;
          cambiado = true;
          nuevo.media = "";
          nuevo.id = "tema";
          link = nuevo;
          pendienteLink = null;
          soloEsta(nuevo);
        }
        var avisado = false;
        function hecho() {
          if (!cambiado || avisado) return;
          avisado = true;
          decir({ tipo: "tema-aplicado", slug: slug }, origen);
          // El alto de la página cambia con el tema (aire, letras): que el
          // editor lo sepa para el minimapa y la barra. Es un aviso pasivo:
          // no mueve al otro aparato.
          if (avisando) setTimeout(function () { avisarPosicion(true); }, 150);
        }
        var enMapa = document.documentElement.classList.contains("mapa");
        var visible = window.innerWidth > 0 && window.innerHeight > 0;
        if (document.startViewTransition && !REDUCIDO.matches && !enMapa && visible) {
          prepararFundido();
          var t = document.startViewTransition(cambio);
          // Una transición pisada por otra rechaza sus promesas: se recogen
          // todas para que no salgan como errores.
          t.ready.catch(function () {});
          t.updateCallbackDone.catch(function () {});
          t.finished.then(hecho, function () { cambio(); hecho(); });
          // Un iframe que no se está pintando (el aparato escondido por el
          // toggle del editor) no llega a arrancar la transición: si en
          // 600 ms no ha cambiado, se cambia sin fundido.
          setTimeout(function () { cambio(); hecho(); }, 600);
        } else {
          cambio();
          hecho();
        }
      });
    };
    nuevo.onerror = function () {
      nuevo.remove();
      if (pendienteLink === nuevo) pendienteLink = null;
      decir({ tipo: "tema-error", slug: slug }, origen);
    };
    link.after(nuevo);
  }

  window.addEventListener("message", function (event) {
    if (!origenPermitido(event.origin)) return;
    var datos = event.data;
    if (!datos || typeof datos !== "object") return;
    esconderBarra();
    if (datos.tipo === "tema-hola") {
      decir({ tipo: "tema-listo", slug: slugActual() }, event.origin);
    } else if (datos.tipo === "tema" && typeof datos.slug === "string" && SLUG.test(datos.slug)) {
      aplicar(datos.slug, event.origin, Array.isArray(datos.archivos) ? datos.archivos.filter(function (a) {
        return a && typeof a.familia === "string" && typeof a.archivo === "string" && /^fuentes\/[a-z0-9-]+\/[\w.-]+\.woff2$/.test(a.archivo);
      }) : []);
    } else if (datos.tipo === "desplazar" && typeof datos.dy === "number" && isFinite(datos.dy)) {
      // El editor no deja tocar la web (para que nadie se vaya por un enlace
      // dentro del mockup), pero sí recorrerla: recoge la rueda o el dedo y
      // manda cuánto bajar (25-10-2026). Siempre "instant": con "auto" se
      // respeta el scroll-behavior: smooth de la web y cada muesca de la
      // rueda arranca una animación que se solapa con la siguiente (iba con
      // retraso, lo notó el usuario).
      window.scrollBy({ top: datos.dy, left: 0, behavior: "instant" });
    } else if (datos.tipo === "arriba") {
      window.scrollTo({ top: 0, behavior: "instant" });
    } else if (datos.tipo === "vistazo") {
      vistazo();
    } else if (datos.tipo === "ir-seccion") {
      irSeccion(datos.indice | 0, +datos.progreso || 0, +datos.fraccion || 0);
    } else if (datos.tipo === "ir-y" && typeof datos.y === "number" && isFinite(datos.y)) {
      // Desde el minimapa del editor: a esa altura de la página. No es eco:
      // el otro aparato tiene que seguir.
      window.scrollTo({ top: Math.max(0, datos.y), behavior: "instant" });
    }
    editor = event.origin;
    if (!avisando) empezarAvisar();
  });

  /* ---- Decirle al editor por dónde va la página -------------------------
     Para que dibuje su barra de scroll junto al mockup: la fracción
     recorrida (0 a 1) y qué parte de la página cabe en la ventana. */
  var editor = null;
  var avisando = false;
  var pendiente = false;

  /* Las secciones de la página, para coordinar el scroll entre el móvil y
     el ordenador por sección (la misma sección en los dos, con el mismo
     avance dentro de ella) y no por porcentaje, que no coincide porque la
     página de móvil es mucho más alta. Se cuentan las <section> hijas de
     <main> (o del body si no hay main). */
  function secciones() {
    var raiz = document.querySelector("main") || document.body;
    var lista = raiz.querySelectorAll(":scope > section");
    return lista.length ? Array.prototype.slice.call(lista) : [];
  }

  function arribaDe(el) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  /* "eco": el scroll lo ha provocado el editor (ir-seccion, vistazo) y no
     hay que rebotarlo al otro aparato. Se marca por tiempo, no con un
     booleano que se apaga al primer evento: un scroll suave manda muchos
     eventos, y si el destino coincidía con la posición no llegaba ninguno
     y la marca se quedaba puesta para el siguiente gesto de verdad. */
  var ecoHasta = 0;
  function marcarEco(ms) { ecoHasta = performance.now() + ms; }
  function esEco() { return performance.now() < ecoHasta; }

  // pasivo: aviso que no viene de un gesto (carga, cambio de tema, tamaño):
  // vale para la barra y el minimapa, pero no mueve al otro aparato.
  function avisarPosicion(pasivo) {
    pendiente = false;
    if (!editor) return;
    var maximo = document.documentElement.scrollHeight - window.innerHeight;
    var y = window.scrollY;
    var lista = secciones();
    var indice = -1, progreso = 0;
    for (var i = 0; i < lista.length; i++) {
      var top = arribaDe(lista[i]);
      if (top <= y + 1) {
        indice = i;
        progreso = lista[i].offsetHeight > 0 ? (y - top) / lista[i].offsetHeight : 0;
      }
    }
    decir({
      tipo: "posicion",
      fraccion: maximo > 0 ? y / maximo : 0,
      visible: Math.min(1, window.innerHeight / document.documentElement.scrollHeight),
      alto: document.documentElement.scrollHeight,
      ventana: window.innerHeight,
      seccion: indice,
      progreso: Math.max(0, Math.min(1.5, progreso)),
      eco: pasivo === true || esEco()
    }, editor);
  }

  /* Colocarse donde está el otro aparato: misma sección y mismo avance. */
  function irSeccion(indice, progreso, fraccion) {
    var lista = secciones();
    var destino;
    if (indice >= 0 && indice < lista.length) {
      destino = arribaDe(lista[indice]) + progreso * lista[indice].offsetHeight;
    } else if (indice === -1 && lista.length && progreso === 0) {
      destino = 0;
    } else {
      destino = fraccion * (document.documentElement.scrollHeight - window.innerHeight);
    }
    marcarEco(200);
    window.scrollTo({ top: Math.max(0, destino), behavior: "instant" });
  }

  function empezarAvisar() {
    avisando = true;
    window.addEventListener("scroll", function () {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(function () { avisarPosicion(false); });
    }, { passive: true });
    window.addEventListener("resize", function () { avisarPosicion(true); });
    window.addEventListener("load", function () { setTimeout(function () { avisarPosicion(true); }, 100); });
    avisarPosicion(true);
  }

  /* Un vistazo: baja un poco y vuelve, para enseñar que la web se recorre
     dentro del mockup. Lo pide el editor una sola vez, al cargar. */
  function vistazo() {
    var cuanto = Math.min(160, document.documentElement.scrollHeight - window.innerHeight);
    if (cuanto <= 0) return;
    var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducido) return;
    marcarEco(1600);
    window.scrollTo({ top: cuanto, behavior: "smooth" });
    setTimeout(function () { window.scrollTo({ top: 0, behavior: "smooth" }); }, 650);
  }

  /* El saludo al arrancar: solo si sabemos quién nos tiene dentro (el
     referrer) y está permitido. Si el referrer no llega (política del
     navegador), el editor manda tema-hola y se contesta igual. */
  var referrer = "";
  try { referrer = new URL(document.referrer).origin; } catch (e) {}
  if (referrer && origenPermitido(referrer)) {
    esconderBarra();
    editor = referrer;
    decir({ tipo: "tema-listo", slug: slugActual() }, referrer);
    empezarAvisar();
  }
})();
