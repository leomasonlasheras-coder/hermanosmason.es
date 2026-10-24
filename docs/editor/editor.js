(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var WEB = params.get("web") || "";
  var TEMA_INICIAL = params.get("tema") || "";
  var CATALOGO = params.get("catalogo") || "../temas/catalogo.json";
  if (params.get("embebido")) document.body.classList.add("embebido");
  var WHATSAPP = "https://wa.me/34699072079?text=";
  var ESPERA_MS = 6000;

  var origenWeb = null;
  if (WEB) { try { origenWeb = new URL(WEB, location.href).origin; } catch (e) { origenWeb = null; } }

  var lista = document.getElementById("lista");
  var plantilla = document.getElementById("plantilla-estilo");
  var iframe = document.getElementById("web");
  var marco = document.getElementById("marco");
  var estado = document.getElementById("estado");
  var elegido = document.getElementById("elegido");
  var pedir = document.getElementById("pedir");

  var presets = [];
  var porSlug = {};
  var actual = "";
  var original = "";   // el tema que llevaba la web al abrir el editor
  var filtro = "todos";
  var webResponde = false;
  var temporizador = null;

  var familias = document.getElementById("familias");
  var cuenta = document.getElementById("cuenta");
  var botonVolver = document.getElementById("volver");
  var NOMBRE_FAMILIA = { sereno: "Serenos", calido: "Cálidos", atrevido: "Atrevidos" };

  function visibles() {
    return presets.filter(function (p) { return filtro === "todos" || p.familia === filtro; });
  }

  function pintarCuenta() {
    var lista = visibles();
    var i = lista.findIndex(function (p) { return p.slug === actual; });
    cuenta.textContent = (i === -1 ? "—" : i + 1) + " de " + lista.length;
    botonVolver.hidden = !original || actual === original;
    document.querySelectorAll(".estilo__tuyo").forEach(function (e) {
      e.hidden = e.closest(".estilo").dataset.slug !== original;
    });
  }

  function saltar(paso) {
    var lista = visibles();
    if (!lista.length) return;
    var i = lista.findIndex(function (p) { return p.slug === actual; });
    var j = i === -1 ? (paso > 0 ? 0 : lista.length - 1) : (i + paso + lista.length) % lista.length;
    elegir(lista[j].slug);
  }

  function alAzar() {
    var lista = visibles().filter(function (p) { return p.slug !== actual; });
    if (!lista.length) return;
    elegir(lista[Math.floor(Math.random() * lista.length)].slug);
  }

  function filtrar(familia) {
    filtro = familia;
    familias.querySelectorAll(".familia").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.familia === familia ? "true" : "false");
    });
    lista.querySelectorAll(".estilos__item").forEach(function (li) {
      var slug = li.querySelector(".estilo").dataset.slug;
      li.hidden = familia !== "todos" && porSlug[slug].familia !== familia;
    });
    pintarCuenta();
  }

  function pintarFamilias() {
    var cuentas = {};
    presets.forEach(function (p) { cuentas[p.familia] = (cuentas[p.familia] || 0) + 1; });
    var claves = ["todos"].concat(Object.keys(NOMBRE_FAMILIA).filter(function (f) { return cuentas[f]; }));
    claves.forEach(function (f) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "familia";
      b.dataset.familia = f;
      b.setAttribute("aria-pressed", f === "todos" ? "true" : "false");
      b.textContent = f === "todos" ? "Todos (" + presets.length + ")" : NOMBRE_FAMILIA[f] + " (" + cuentas[f] + ")";
      b.addEventListener("click", function () { filtrar(f); });
      familias.appendChild(b);
    });
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

  function decirEstado(texto, mal) {
    estado.textContent = texto;
    estado.classList.toggle("vista__estado--mal", !!mal);
  }

  function marcar(slug) {
    actual = slug;
    var p = porSlug[slug];
    lista.querySelectorAll(".estilo").forEach(function (b) {
      var es = b.dataset.slug === slug;
      b.setAttribute("aria-pressed", es ? "true" : "false");
      if (es) {
        var r = b.getBoundingClientRect(), l = lista.getBoundingClientRect();
        if (r.top < l.top) lista.scrollTop -= l.top - r.top + 8;
        else if (r.bottom > l.bottom) lista.scrollTop += r.bottom - l.bottom + 8;
        if (r.left < l.left) lista.scrollLeft -= l.left - r.left + 8;
        else if (r.right > l.right) lista.scrollLeft += r.right - l.right + 8;
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
    boton.setAttribute("aria-label", "Estilo " + p.nombre);
    Object.keys(p.variables).forEach(function (clave) {
      boton.style.setProperty("--m-" + clave, p.variables[clave]);
    });
    nodo.querySelector(".estilo__texto").textContent = p.nombre;
    nodo.querySelector(".estilo__frase").textContent = p.frase;
    boton.addEventListener("click", function () { elegir(p.slug); });
    return nodo;
  }

  function elegir(slug) {
    if (!porSlug[slug]) return;
    marcar(slug);
    if (webResponde && iframe.contentWindow && origenWeb) {
      iframe.contentWindow.postMessage({ tipo: "tema", slug: slug }, origenWeb);
      decirEstado("Cambiando a " + porSlug[slug].nombre + "…");
    }
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== origenWeb || event.source !== iframe.contentWindow) return;
    var d = event.data;
    if (!d || typeof d !== "object") return;
    if (d.tipo === "tema-listo") {
      webResponde = true;
      clearTimeout(temporizador);
      if (!original && porSlug[d.slug]) original = d.slug;
      decirEstado("Tu web, lista. Toca un estilo, o pasa con las flechas.");
      if (TEMA_INICIAL && porSlug[TEMA_INICIAL] && d.slug !== TEMA_INICIAL) {
        elegir(TEMA_INICIAL);
      } else if (porSlug[d.slug]) {
        marcar(d.slug);
      } else if (!actual && presets.length) {
        marcar(presets[0].slug);
      }
    } else if (d.tipo === "tema-aplicado") {
      var p = porSlug[d.slug];
      decirEstado(p ? "Así se ve con " + p.nombre + "." : "Hecho.");
    } else if (d.tipo === "tema-error") {
      decirEstado("Ese estilo no ha cargado. Prueba otro.", true);
    }
  });

  iframe.addEventListener("load", function () {
    if (webResponde || !iframe.contentWindow || !origenWeb) return;
    iframe.contentWindow.postMessage({ tipo: "tema-hola" }, origenWeb);
    temporizador = setTimeout(function () {
      if (!webResponde) {
        decirEstado("Esta web todavía no admite la vista previa en directo. Te la enseñamos nosotros.", true);
      }
    }, ESPERA_MS);
  });

  var ANCHA = window.matchMedia("(min-width: 60rem)");

  function medirMarco() {
    if (ANCHA.matches) {
      var alto = Math.max(420, window.innerHeight - marco.getBoundingClientRect().top - 88);
      marco.style.setProperty("--alto", alto + "px");
    } else {
      marco.style.removeProperty("--alto");
    }
    var ancho = marco.clientWidth - 2;
    marco.style.setProperty("--escala", Math.min(1, ancho / 1280));
  }

  document.querySelectorAll(".dispositivo").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".dispositivo").forEach(function (o) {
        o.setAttribute("aria-pressed", o === b ? "true" : "false");
      });
      marco.classList.toggle("marco--movil", b.dataset.dispositivo === "movil");
      marco.classList.toggle("marco--escritorio", b.dataset.dispositivo === "escritorio");
      medirMarco();
    });
  });

  window.addEventListener("resize", medirMarco);

  fetch(CATALOGO)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (catalogo) {
      presets = catalogo.presets;
      presets.forEach(function (p) { porSlug[p.slug] = p; });
      var frag = document.createDocumentFragment();
      presets.forEach(function (p) { frag.appendChild(tarjeta(p)); });
      lista.appendChild(frag);
      pintarFamilias();
      if (TEMA_INICIAL && porSlug[TEMA_INICIAL]) marcar(TEMA_INICIAL);
      pintarCuenta();
      medirMarco();
      if (!origenWeb) { decirEstado("Falta la dirección de tu web. Escríbenos y la enlazamos.", true); return; }
      var destino = new URL(WEB, location.href);
      if (TEMA_INICIAL) destino.searchParams.set("tema", TEMA_INICIAL);
      iframe.src = destino.href;
    })
    .catch(function (e) {
      decirEstado("No se ha podido leer el catálogo de estilos (" + e.message + ").", true);
    });
})();
