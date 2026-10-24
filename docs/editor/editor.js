(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var WEB = params.get("web") || "";
  var TEMA_INICIAL = params.get("tema") || "";
  var CATALOGO = params.get("catalogo") || "../temas/catalogo.json";
  var WHATSAPP = "https://wa.me/34699072079?text=";
  var ESPERA_MS = 6000;
  if (params.get("embebido")) document.body.classList.add("embebido");

  var origenWeb = null;
  if (WEB) { try { origenWeb = new URL(WEB, location.href).origin; } catch (e) { origenWeb = null; } }

  var lista = document.getElementById("lista");
  var plantilla = document.getElementById("plantilla-estilo");
  var pantallas = Array.prototype.slice.call(document.querySelectorAll(".pantalla"));
  var iframes = pantallas.map(function (p) { return p.querySelector(".web"); });
  var estado = document.getElementById("estado");
  var elegido = document.getElementById("elegido");
  var pedir = document.getElementById("pedir");
  var cuenta = document.getElementById("cuenta");
  var botonVolver = document.getElementById("volver");
  var urlOrdenador = document.getElementById("url-ordenador");

  var presets = [];
  var porSlug = {};
  var actual = "";
  var original = "";   // el tema que llevaba la web al abrir el editor
  var webResponde = false;
  var temporizador = null;

  function decirEstado(texto, mal) {
    estado.textContent = texto;
    estado.classList.toggle("estado--mal", !!mal);
  }

  function visibles() { return presets; }

  function pintarCuenta() {
    var v = visibles();
    var i = v.findIndex(function (p) { return p.slug === actual; });
    cuenta.textContent = (i === -1 ? "—" : i + 1) + " de " + v.length;
    botonVolver.hidden = !original || actual === original;
    document.querySelectorAll(".estilo__tuyo").forEach(function (e) {
      e.hidden = e.closest(".estilo").dataset.slug !== original;
    });
  }

  function marcar(slug) {
    actual = slug;
    var p = porSlug[slug];
    lista.querySelectorAll(".estilo").forEach(function (b) {
      var es = b.dataset.slug === slug;
      b.setAttribute("aria-pressed", es ? "true" : "false");
      if (es) {
        var li = b.parentElement;
        var destino = li.offsetLeft + li.offsetWidth / 2 - lista.clientWidth / 2;
        lista.scrollTo({ left: destino, behavior: REDUCIDO.matches ? "auto" : "smooth" });
      }
    });
    elegido.textContent = p ? p.nombre : slug || "—";
    var mensaje = "Hola, he probado los estilos en el panel y quiero el estilo «" + (p ? p.nombre : slug) + "» para mi web (" + WEB + ").";
    pedir.href = WHATSAPP + encodeURIComponent(mensaje);
    pedir.setAttribute("aria-disabled", p ? "false" : "true");
    pintarCuenta();
  }

  function tarjeta(p) {
    var nodo = plantilla.content.cloneNode(true);
    var boton = nodo.querySelector(".estilo");
    boton.dataset.slug = p.slug;
    boton.setAttribute("aria-label", "Estilo " + p.nombre + ". " + p.frase);
    boton.title = p.frase;
    Object.keys(p.variables).forEach(function (clave) {
      boton.style.setProperty("--m-" + clave, p.variables[clave]);
    });
    nodo.querySelector(".estilo__texto").textContent = p.nombre;
    boton.addEventListener("click", function () { elegir(p.slug); });
    return nodo;
  }

  function elegir(slug) {
    if (!porSlug[slug]) return;
    marcar(slug);
    if (webResponde && origenWeb) {
      iframes.forEach(function (f) {
        if (f.contentWindow) f.contentWindow.postMessage({ tipo: "tema", slug: slug }, origenWeb);
      });
      decirEstado("Cambiando a " + porSlug[slug].nombre + "…");
    }
  }

  function saltar(paso) {
    var v = visibles();
    if (!v.length) return;
    var i = v.findIndex(function (p) { return p.slug === actual; });
    var j = i === -1 ? (paso > 0 ? 0 : v.length - 1) : (i + paso + v.length) % v.length;
    elegir(v[j].slug);
  }

  function alAzar() {
    var v = visibles().filter(function (p) { return p.slug !== actual; });
    if (!v.length) return;
    elegir(v[Math.floor(Math.random() * v.length)].slug);
  }

  document.getElementById("anterior").addEventListener("click", function () { saltar(-1); });
  document.getElementById("siguiente").addEventListener("click", function () { saltar(1); });
  document.getElementById("sorpresa").addEventListener("click", alAzar);
  botonVolver.addEventListener("click", function () { if (original) elegir(original); });
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === "ArrowLeft") { saltar(-1); e.preventDefault(); }
    if (e.key === "ArrowRight") { saltar(1); e.preventDefault(); }
  });

  function esNuestro(fuente) {
    return iframes.some(function (f) { return f.contentWindow === fuente; });
  }

  var aplicados = 0;

  window.addEventListener("message", function (event) {
    if (event.origin !== origenWeb || !esNuestro(event.source)) return;
    var d = event.data;
    if (!d || typeof d !== "object") return;
    if (d.tipo === "tema-listo") {
      var primera = !webResponde;
      webResponde = true;
      clearTimeout(temporizador);
      if (!original && porSlug[d.slug]) original = d.slug;
      if (primera) {
        decirEstado("Tu web, lista. Toca un estilo, o pasa con las flechas.");
        if (TEMA_INICIAL && porSlug[TEMA_INICIAL] && d.slug !== TEMA_INICIAL) {
          elegir(TEMA_INICIAL);
        } else if (porSlug[d.slug]) {
          marcar(d.slug);
        } else if (!actual && presets.length) {
          marcar(presets[0].slug);
        }
      }
    } else if (d.tipo === "tema-aplicado") {
      var p = porSlug[d.slug];
      if (d.slug === actual) decirEstado(p ? "Así se ve con " + p.nombre + "." : "Hecho.");
    } else if (d.tipo === "tema-error") {
      decirEstado("Ese estilo no ha cargado. Prueba otro.", true);
    }
  });

  iframes.forEach(function (f) {
    f.addEventListener("load", function () {
      if (webResponde || !f.contentWindow || !origenWeb) return;
      f.contentWindow.postMessage({ tipo: "tema-hola" }, origenWeb);
      if (!temporizador) {
        temporizador = setTimeout(function () {
          if (!webResponde) {
            decirEstado("Esta web todavía no admite la vista previa en directo. Puedes elegir igualmente y te la enseñamos nosotros.", true);
          }
        }, ESPERA_MS);
      }
    });
  });

  var aparatos = document.querySelector(".aparatos");
  var ordenador = document.querySelector(".ordenador");
  var movil = document.querySelector(".movil");
  var ESTRECHA = window.matchMedia("(max-width: 48rem)");
  var REDUCIDO = window.matchMedia("(prefers-reduced-motion: reduce)");

  function medir() {
    var reservado = 0;
    [".cabecera", ".mandos", ".estilos", ".pedir"].forEach(function (s) {
      var e = document.querySelector(s);
      if (e && e.offsetParent !== null) reservado += e.offsetHeight;
    });
    var altoMax = Math.max(240, window.innerHeight - reservado - 100);
    if (ESTRECHA.matches) {
      ordenador.style.width = "";
      movil.style.width = "";
    } else {
      var hueco = aparatos.clientWidth;
      var anchoOrd = Math.min(hueco * 0.76, 1024, (altoMax - 64) / 0.625);
      ponerAnchos(anchoOrd);
      var sobra = document.documentElement.scrollHeight - window.innerHeight;
      if (sobra > 0) ponerAnchos(Math.max(260, anchoOrd - sobra / 0.625 - 8));
    }
    escalar();
    document.body.classList.toggle("desbordado", document.documentElement.scrollHeight > window.innerHeight + 2);
  }

  function ponerAnchos(anchoOrd) {
    ordenador.style.width = anchoOrd + "px";
    var altoPantalla = (anchoOrd - 16) * 0.625;
    movil.style.width = Math.round((altoPantalla + 16) / 2.164 + 16) + "px";
    escalar();
  }

  function escalar() {
    pantallas.forEach(function (p) {
      var base = parseInt(p.dataset.base, 10);
      var escala = p.clientWidth / base;
      var f = p.querySelector(".web");
      if (!escala) return;
      f.style.setProperty("--escala", escala);
      f.style.height = Math.ceil(p.clientHeight / escala) + "px";
    });
  }

  window.addEventListener("resize", medir);
  window.addEventListener("load", medir);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);

  fetch(CATALOGO)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (catalogo) {
      presets = catalogo.presets;
      presets.forEach(function (p) { porSlug[p.slug] = p; });
      var frag = document.createDocumentFragment();
      presets.forEach(function (p) { frag.appendChild(tarjeta(p)); });
      lista.appendChild(frag);
      if (TEMA_INICIAL && porSlug[TEMA_INICIAL]) marcar(TEMA_INICIAL);
      pintarCuenta();
      medir();
      if (!origenWeb) { decirEstado("Falta la dirección de tu web. Escríbenos y la enlazamos.", true); return; }
      urlOrdenador.textContent = WEB.replace(/^https?:\/\//, "").replace(/\/$/, "");
      var destino = new URL(WEB, location.href);
      if (TEMA_INICIAL) destino.searchParams.set("tema", TEMA_INICIAL);
      iframes.forEach(function (f) { f.src = destino.href; });
    })
    .catch(function (e) {
      decirEstado("No se ha podido leer el catálogo de estilos (" + e.message + ").", true);
    });
})();
