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
  var mapa = document.querySelector(".mapa");
  var mapaPantalla = mapa.querySelector(".mapa__pantalla");
  var mapaWeb = mapa.querySelector(".web--mapa");
  var resalto = mapa.querySelector(".mapa__resalto");
  var mapaCapa = mapa.querySelector(".mapa__capa");
  var iframes = pantallas.map(function (p) { return p.querySelector(".web"); }).concat([mapaWeb]);
  var webOrdenador = pantallas[0].querySelector(".web");
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
      var archivos = porSlug[slug].archivos || [];
      iframes.forEach(function (f) {
        if (f.contentWindow) f.contentWindow.postMessage({ tipo: "tema", slug: slug, archivos: archivos }, origenWeb);
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

  document.getElementById("anterior").addEventListener("click", function () { saltar(-1); });
  document.getElementById("siguiente").addEventListener("click", function () { saltar(1); });
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

  var paginaAlto = 0, paginaVentana = 800, mapaEscala = 0.05, mapaIzq = 0;

  function actualizarMapa(d) {
    if (d.alto) paginaAlto = d.alto;
    if (d.ventana) paginaVentana = d.ventana;
    if (!paginaAlto) return;
    var anchoCol = mapa.clientWidth - 2;
    var altoCol = (mapaAltoObjetivo || mapa.clientHeight) - 2;
    if (anchoCol <= 0 || altoCol <= 0) return;
    mapaEscala = Math.min(anchoCol / 1280, altoCol / paginaAlto);
    var anchoWeb = 1280 * mapaEscala;
    mapaPantalla.style.width = Math.round(anchoWeb + 2) + "px";
    mapaIzq = 0;
    mapaWeb.style.height = paginaAlto + "px";
    mapaWeb.style.left = "0px";
    mapaWeb.style.setProperty("--escala", mapaEscala);
    var y = (d.fraccion || 0) * Math.max(0, paginaAlto - paginaVentana);
    resalto.style.left = mapaIzq + "px";
    resalto.style.width = anchoWeb + "px";
    resalto.style.top = (y * mapaEscala) + "px";
    resalto.style.height = Math.max(6, paginaVentana * mapaEscala) + "px";
  }

  function irDesdeMapa(e) {
    var r = mapaPantalla.getBoundingClientRect();
    var y = (e.clientY - r.top - 1) / mapaEscala - paginaVentana / 2;
    if (webOrdenador.contentWindow && origenWeb && webResponde) {
      webOrdenador.contentWindow.postMessage({ tipo: "ir-y", y: y }, origenWeb);
    }
  }

  (function () {
    var pulsado = false;
    mapaCapa.addEventListener("pointerdown", function (e) {
      pulsado = true;
      mapaCapa.setPointerCapture(e.pointerId);
      mapaCapa.classList.add("is-arrastrando");
      irDesdeMapa(e);
    });
    mapaCapa.addEventListener("pointermove", function (e) { if (pulsado) irDesdeMapa(e); });
    function soltar() { pulsado = false; mapaCapa.classList.remove("is-arrastrando"); }
    mapaCapa.addEventListener("pointerup", soltar);
    mapaCapa.addEventListener("pointercancel", soltar);
    mapaCapa.addEventListener("wheel", function (e) {
      e.preventDefault();
      pedirDesplazar(pantallas[0].querySelector(".pantalla__capa"), e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
    }, { passive: false });
  })();

  function pintarScroll(fuente, fraccion, visible) {
    iframes.forEach(function (f) {
      if (f.contentWindow !== fuente) return;
      var barra = f.parentElement.querySelector(".pantalla__scroll");
      var pulgar = barra && barra.querySelector(".pantalla__pulgar");
      if (!pulgar) return;
      var alto = Math.max(0.08, Math.min(1, visible || 0));
      barra.style.opacity = alto >= 1 ? "0" : "1";
      pulgar.style.height = (alto * 100) + "%";
      pulgar.style.top = (Math.max(0, Math.min(1, fraccion || 0)) * (1 - alto) * 100) + "%";
    });
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
        setTimeout(function () {
          iframes.forEach(function (f) {
            if (f !== mapaWeb && f.contentWindow) f.contentWindow.postMessage({ tipo: "vistazo" }, origenWeb);
          });
        }, 1400);
        if (TEMA_INICIAL && porSlug[TEMA_INICIAL] && d.slug !== TEMA_INICIAL) {
          elegir(TEMA_INICIAL);
        } else if (porSlug[d.slug]) {
          marcar(d.slug);
        } else if (!actual && presets.length) {
          marcar(presets[0].slug);
        }
      }
    } else if (d.tipo === "posicion") {
      if (event.source === mapaWeb.contentWindow) return;
      pintarScroll(event.source, d.fraccion, d.visible);
      if (event.source === webOrdenador.contentWindow) actualizarMapa(d);
      if (!d.eco) {
        iframes.forEach(function (f) {
          if (f !== mapaWeb && f.contentWindow && f.contentWindow !== event.source) {
            f.contentWindow.postMessage({ tipo: "ir-seccion", indice: d.seccion, progreso: d.progreso, fraccion: d.fraccion }, origenWeb);
          }
        });
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

  var principal = "ordenador";
  var PANTALLA = { ordenador: { base: 1280, aspecto: 0.625, bisel: 30 }, movil: { base: 390, aspecto: 2.164, bisel: 20 } };
  var mapaAltoObjetivo = 0;

  function medir() {
    var reservado = 0;
    [".cabecera", ".mandos", ".estilos", ".pedir"].forEach(function (s) {
      var e = document.querySelector(s);
      if (e && e.offsetParent !== null) reservado += e.offsetHeight;
    });
    var altoMax = Math.max(240, window.innerHeight - reservado - 72); // huecos entre bloques
    if (ESTRECHA.matches) {
      ordenador.style.width = "";
      movil.style.width = "";
      mapa.style.height = "";
      escalarMedido();
    } else {
      disponer(altoMax);
    }
    clearTimeout(medir.t);
    medir.t = setTimeout(function () {
      document.body.classList.toggle("desbordado", document.documentElement.scrollHeight > window.innerHeight + 2);
    }, 700);
  }

  function disponer(altoMax) {
    var hueco = aparatos.clientWidth - 84 - 24; // menos el minimapa y su hueco
    var pOrd, pMov; // anchos de PANTALLA (sin bisel)
    pOrd = Math.min((altoMax - 44) / 0.625, 1088 - 30, hueco - 30);
    pMov = (altoMax - 44) / 2.164;
    pOrd = Math.max(200, pOrd);
    pMov = Math.max(90, pMov);
    ordenador.style.width = Math.round(pOrd + 30) + "px";
    movil.style.width = Math.round(pMov + 20) + "px";
    mapaAltoObjetivo = Math.round(pOrd * 0.625 + 30);
    mapa.style.height = mapaAltoObjetivo + "px";
    escalarA("ordenador", pOrd);
    escalarA("movil", pMov);
    actualizarMapa({});
  }

  function escalarA(cual, anchoPantalla) {
    var p = document.querySelector(".pantalla--" + cual);
    var f = p.querySelector(".web");
    var d = PANTALLA[cual];
    var escala = anchoPantalla / d.base;
    f.style.setProperty("--escala", escala);
    f.style.height = Math.ceil((anchoPantalla * d.aspecto) / escala) + "px";
    p.dataset.escala = escala;
  }

  function escalarMedido() {
    pantallas.forEach(function (p) {
      var cual = p.classList.contains("pantalla--movil") ? "movil" : "ordenador";
      escalarA(cual, p.clientWidth - 2);
    });
  }

  function escalar() { if (ESTRECHA.matches) escalarMedido(); }

  function verAparato(cual) {
    principal = cual;
    aparatos.dataset.vista = cual;
    document.querySelectorAll(".vista-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.vista === cual ? "true" : "false");
    });
    medir();
  }

  document.querySelectorAll(".vista-btn").forEach(function (b) {
    b.addEventListener("click", function () { if (b.dataset.vista !== principal) verAparato(b.dataset.vista); });
  });
  aparatos.dataset.vista = principal;

  var acumulado = new Map();

  function pedirDesplazar(capa, dy) {
    acumulado.set(capa, (acumulado.get(capa) || 0) + dy);
    if (acumulado.size === 1) requestAnimationFrame(vaciarDesplazar);
  }

  function vaciarDesplazar() {
    acumulado.forEach(function (dy, capa) {
      var p = capa.parentElement;
      var f = p.querySelector(".web");
      var escala = parseFloat(p.dataset.escala) || 1;
      if (dy && f.contentWindow && origenWeb && webResponde) {
        f.contentWindow.postMessage({ tipo: "desplazar", dy: dy / escala }, origenWeb);
      }
    });
    acumulado.clear();
  }

  document.querySelectorAll(".pantalla__capa").forEach(function (capa) {
    capa.addEventListener("wheel", function (e) {
      e.preventDefault();
      var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * capa.clientHeight : e.deltaY;
      pedirDesplazar(capa, dy);
    }, { passive: false });
    var ultimoY = null, recorrido = 0;
    capa.addEventListener("pointerdown", function (e) {
      ultimoY = e.clientY;
      recorrido = 0;
      capa.setPointerCapture(e.pointerId);
      capa.classList.add("is-arrastrando");
    });
    capa.addEventListener("pointermove", function (e) {
      if (ultimoY === null) return;
      recorrido += Math.abs(ultimoY - e.clientY);
      pedirDesplazar(capa, ultimoY - e.clientY);
      ultimoY = e.clientY;
    });
    function soltar() { ultimoY = null; capa.classList.remove("is-arrastrando"); }

    capa.addEventListener("pointerup", soltar);
    capa.addEventListener("pointercancel", soltar);
  });

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
      if (urlOrdenador) urlOrdenador.textContent = WEB.replace(/^https?:\/\//, "").replace(/\/$/, "");
      var destino = new URL(WEB, location.href);
      if (TEMA_INICIAL) destino.searchParams.set("tema", TEMA_INICIAL);
      iframes.forEach(function (f) {
        if (f === mapaWeb) {
          var m = new URL(destino.href);
          m.searchParams.set("mapa", "1");
          m.searchParams.set("ventana", "800");
          f.src = m.href;
        } else {
          f.src = destino.href;
        }
      });
    })
    .catch(function (e) {
      decirEstado("No se ha podido leer el catálogo de estilos (" + e.message + ").", true);
    });
})();
