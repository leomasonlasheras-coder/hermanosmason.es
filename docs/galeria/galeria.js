(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var CATALOGO = new URL(params.get("catalogo") || "../disenos/catalogo.json", location.href);
  var WHATSAPP = "https://wa.me/34699072079?text=";
  var RECIBIR = "3510b3af-c7f1-4904-a86c-2bc85d468354";   // Web3Forms, pública: solo sirve para enviar
  var PLAZO = "en 48 h";
  var PANELES = ["https://panel.hermanosmason.es"];
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) PANELES.push(location.origin);   // la mesa
  var raiz = document.documentElement;
  if (params.get("embebido")) raiz.classList.add("embebido");

  var lista = document.getElementById("lista");
  var ficha = document.getElementById("ficha");
  var tarjetas = document.getElementById("tarjetas");
  var estado = document.getElementById("estado");
  var plantilla = document.getElementById("plantilla-tarjeta");
  var volver = document.getElementById("volver");
  var nombre = document.getElementById("ficha-nombre");
  var capturas = document.getElementById("capturas");
  var nota = document.getElementById("nota");
  var pedir = document.getElementById("pedir");
  var hoja = document.getElementById("hoja");
  var hojaFoto = document.getElementById("hoja-foto");
  var hojaTitulo = document.getElementById("hoja-titulo");
  var hojaTexto = document.getElementById("hoja-texto");
  var hojaSi = document.getElementById("hoja-si");
  var hojaNo = document.getElementById("hoja-no");
  var REDUCIDO = window.matchMedia("(prefers-reduced-motion: reduce)");

  var disenos = [];
  var porSlug = {};
  var abierto = null;        // el diseño de la ficha
  var clienta = null;        // { nombre, correo, diseno, web }, del panel
  var pedido = "";           // el último diseño pedido por correo
  var enviando = false;
  var respaldo = false;      // el envío falló: el botón lleva a WhatsApp
  var scrollLista = 0;
  var desdeLista = false;    // la ficha se abrió desde la lista: volver es ir atrás

  function normal(texto) { return String(texto || "").trim().toLowerCase(); }
  function esSuyo(d) { return !!(clienta && clienta.diseno && d && normal(clienta.diseno) === normal(d.nombre)); }
  function dondeEsta(src) { return new URL(src, CATALOGO).href; }

  function cambiar(hacer, paso) {
    if (!document.startViewTransition || REDUCIDO.matches) { hacer(); return; }
    raiz.dataset.paso = paso;
    var t = document.startViewTransition(hacer);
    t.ready.catch(function () {});
    t.finished.catch(function () {}).then(function () { delete raiz.dataset.paso; });
  }

  var nivelAvisado = null;
  function avisarNivel(enFicha, luego) {
    if (window.parent === window || nivelAvisado === enFicha) { if (luego) luego(); return; }
    nivelAvisado = enFicha;
    window.parent.postMessage({ tipo: "galeria-nivel", ficha: enFicha }, "*");
    if (!luego) return;
    var hecho = false;
    function seguir() { if (hecho) return; hecho = true; window.removeEventListener("resize", seguir); luego(); }
    window.addEventListener("resize", seguir);
    setTimeout(seguir, 150);
  }

  function decirEstado(texto, mal) {
    estado.textContent = texto || "";
    estado.hidden = !texto;
    estado.classList.toggle("estado--mal", !!mal);
  }

  function pintarLista() {
    var frag = document.createDocumentFragment();
    disenos.forEach(function (d) {
      var nodo = plantilla.content.cloneNode(true);
      var a = nodo.querySelector(".tarjeta");
      a.href = "#" + d.slug;
      a.dataset.slug = d.slug;
      var img = nodo.querySelector("img");
      img.src = dondeEsta(d.tarjeta.src);
      img.width = d.tarjeta.ancho;
      img.height = d.tarjeta.alto;
      nodo.querySelector(".tarjeta__nombre").textContent = d.nombre;
      frag.appendChild(nodo);
    });
    if (disenos.length < 3) {
      var li = document.createElement("li");
      li.className = "tarjeta tarjeta--pronto";
      li.setAttribute("aria-hidden", "true");
      li.textContent = "Estamos diseñando más";
      frag.appendChild(li);
    }
    tarjetas.replaceChildren(frag);
    pintarTuyo();
  }

  function pintarTuyo() {
    tarjetas.querySelectorAll("a.tarjeta").forEach(function (a) {
      var d = porSlug[a.dataset.slug];
      var suyo = esSuyo(d);
      a.classList.toggle("is-tuyo", suyo);
      a.querySelector(".tarjeta__estado").textContent = suyo ? "El tuyo" : "Disponible";
      a.setAttribute("aria-label", d.nombre + (suyo ? ", el diseño de tu web" : ", disponible"));
    });
    pintarPedir();
  }

  tarjetas.addEventListener("click", function (e) {
    if (e.target.closest("a.tarjeta")) desdeLista = true;
  });

  function pintarCapturas(d) {
    var frag = document.createDocumentFragment();
    var n = 0;
    d.paginas.forEach(function (p) {
      if (d.paginas.length > 1) {
        var h = document.createElement("h3");
        h.className = "capturas__pagina";
        h.textContent = p.nombre;
        frag.appendChild(h);
      }
      p.secciones.forEach(function (s) {
        var c = s.ordenador || s.movil;
        if (!c) return;
        var fig = document.createElement("figure");
        fig.className = "seccion";
        var pie = document.createElement("figcaption");
        pie.className = "seccion__titulo";
        pie.textContent = s.nombre;
        var img = document.createElement("img");
        img.src = dondeEsta(c.src);
        img.width = c.ancho;
        img.height = c.alto;
        img.alt = d.nombre + ", " + p.nombre + ", " + s.nombre;
        img.decoding = "async";
        if (n++ > 1) img.loading = "lazy";
        fig.append(pie, img);
        frag.appendChild(fig);
      });
    });
    capturas.replaceChildren(frag);
  }

  volver.addEventListener("click", function (e) {
    e.preventDefault();
    if (desdeLista) history.back();
    else location.hash = "";
  });

  function decirNota(texto) { nota.textContent = texto || ""; }

  function rotular(texto, etiqueta, hecho, apagado) {
    pedir.textContent = texto;
    pedir.setAttribute("aria-label", etiqueta);
    pedir.classList.toggle("is-hecho", hecho);
    pedir.setAttribute("aria-disabled", apagado ? "true" : "false");
  }

  function pintarPedir() {
    var d = abierto;
    if (!d) return;
    var web = clienta && clienta.web ? " (" + clienta.web + ")" : "";
    pedir.href = WHATSAPP + encodeURIComponent("Hola, he visto vuestra colección privada en el panel y quiero el diseño «" + d.nombre + "» para mi web" + web + ".");
    if (enviando) return;
    respaldo = false;
    if (esSuyo(d)) rotular("El tuyo", "Es el diseño de tu web", true, true);
    else if (d.slug === pedido) rotular("Pedido", "Diseño pedido", true, true);
    else rotular("Pedir", "Pedir el diseño " + d.nombre, false, false);
  }

  function abrirHoja(d) {
    if (typeof hoja.showModal !== "function") { mandarPedido(d); return; }
    hojaFoto.src = dondeEsta(d.tarjeta.src);
    hojaTitulo.textContent = "¿Pasamos tu web a " + d.nombre + "?";
    hojaTexto.textContent = "Te la preparamos nosotros " + PLAZO + ", con tus textos y tus fotos. Es tu cambio de diseño de este mes.";
    hojaSi.textContent = "Pedir " + d.nombre;
    hoja.showModal();
  }

  hojaSi.addEventListener("click", function () {
    hoja.close();
    if (abierto) mandarPedido(abierto);
  });
  hojaNo.addEventListener("click", function () { hoja.close(); });
  hoja.addEventListener("click", function (e) { if (e.target === hoja) hoja.close(); });   // fuera de la caja

  function mandarPedido(d) {
    var antes = clienta.diseno || "(sin elegir)";
    enviando = true;
    rotular("Enviando…", "Enviando el pedido", false, true);
    var controlador = window.AbortController ? new AbortController() : null;
    var reloj = controlador ? setTimeout(function () { controlador.abort(); }, 12000) : 0;
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        access_key: RECIBIR,
        subject: "Diseño: " + (clienta.nombre || clienta.correo) + " quiere " + d.nombre,
        from_name: "hermanosmason.es",
        Clienta: clienta.nombre || "(sin nombre)",
        Correo: clienta.correo,
        Web: clienta.web || "(sin web)",
        "Diseño pedido": d.nombre + " (" + d.slug + ")",
        "Diseño de ahora": antes,
        Plazo: "Le hemos dicho que lo tiene " + PLAZO + " (naturales, desde ahora)",
        Ojo: "Un cambio de diseño al mes: mirar si ya ha pedido otro este mes",
        Enviado: new Date().toISOString()
      }),
      signal: controlador ? controlador.signal : undefined
    }).then(function (respuesta) {
      return respuesta.json().then(
        function (json) { return respuesta.ok && !!(json && json.success); },
        function () { return respuesta.ok; }
      );
    }).then(function (bien) {
      if (!bien) throw new Error("Web3Forms no lo ha aceptado");
      pedido = d.slug;
    }).catch(function () {
      respaldo = true;
    }).then(function () {
      clearTimeout(reloj);
      enviando = false;
      if (respaldo && abierto === d) {
        rotular("Pedir por WhatsApp", "No ha salido: pedir por WhatsApp", false, false);
        decirNota("No ha salido. Pídelo por WhatsApp.");
      } else {
        pintarPedir();
        if (pedido === d.slug) decirNota("Pedido. Te la preparamos " + PLAZO + ", con tus textos y tus fotos.");
      }
    });
  }

  pedir.addEventListener("click", function (e) {
    if (pedir.getAttribute("aria-disabled") === "true") { e.preventDefault(); return; }
    if (respaldo || !clienta || !window.fetch) return;   // sigue el enlace: WhatsApp
    e.preventDefault();
    abrirHoja(abierto);
  });

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || PANELES.indexOf(event.origin) === -1) return;
    var d = event.data;
    if (!d || d.tipo !== "clienta" || !d.correo) return;
    clienta = { nombre: String(d.nombre || ""), correo: String(d.correo), diseno: String(d.diseno || ""), web: String(d.web || "") };
    pintarTuyo();
  });
  if (window.parent !== window) window.parent.postMessage({ tipo: "galeria-hola" }, "*");

  function mostrar() {
    var d = porSlug[decodeURIComponent(location.hash.slice(1))] || null;
    if (hoja.open) hoja.close();
    if (d === abierto) { document.body.classList.toggle("en-ficha", !!d); avisarNivel(!!d); return; }
    if (d && !abierto) scrollLista = window.scrollY;
    abierto = d;
    avisarNivel(!!d, function () {
      cambiar(function () {
        document.body.classList.toggle("en-ficha", !!d);
        if (d) {
          respaldo = false;
          nombre.textContent = d.nombre;
          decirNota("");
          pintarCapturas(d);
          pintarPedir();
          lista.hidden = true;
          ficha.hidden = false;
          window.scrollTo({ top: 0, behavior: "instant" });
        } else {
          desdeLista = false;
          ficha.hidden = true;
          lista.hidden = false;
          window.scrollTo({ top: scrollLista, behavior: "instant" });
        }
      }, d ? "adelante" : "atras");
    });
  }

  window.addEventListener("hashchange", mostrar);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && abierto && !hoja.open) volver.click();   // con la hoja abierta, Escape solo la cierra
  });

  fetch(CATALOGO.href, { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (catalogo) {
      disenos = (catalogo.disenos || []).filter(function (d) {
        if (!d || !d.slug || !d.tarjeta) return false;
        if (!d.paginas && d.secciones) d.paginas = [{ nombre: "Inicio", secciones: d.secciones }];
        return !!(d.paginas && d.paginas.length);
      });
      disenos.forEach(function (d) { porSlug[d.slug] = d; });
      if (!disenos.length) {
        decirEstado("Estamos terminando los primeros diseños de la colección. Muy pronto, aquí.");
        return;
      }
      decirEstado("");
      pintarLista();
      mostrar();
    })
    .catch(function () {
      decirEstado("No se ha podido abrir la colección. Vuelve a intentarlo en un rato.", true);
    });
})();
