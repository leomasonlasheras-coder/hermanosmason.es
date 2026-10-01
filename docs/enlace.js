(function () {
  "use strict";

  var form = document.querySelector("form.preparar");
  if (!form) return;

  var destino = form.getAttribute("action") || "";
  var tramos = Array.prototype.slice.call(form.querySelectorAll(".tramo"));
  var pasos = Array.prototype.slice.call(form.querySelectorAll(".progreso li"));
  var estado = form.querySelector(".form__estado");
  var actual = 0;

  function ir(n, enfocar) {
    actual = Math.max(0, Math.min(tramos.length - 1, n));
    tramos.forEach(function (t, i) { t.hidden = i !== actual; });
    pasos.forEach(function (li, i) {
      li.classList.toggle("is-hecho", i < actual);
      if (i === actual) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
      var circulo = li.querySelector("[data-paso]");
      if (circulo) circulo.disabled = i >= actual;
    });
    if (enfocar) {
      var legend = tramos[actual].querySelector("legend");
      if (legend) {
        legend.setAttribute("tabindex", "-1");
        legend.focus({ preventScroll: true });
      }
      form.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  form.addEventListener("click", function (e) {
    var paso = e.target.closest("[data-paso]");
    if (paso) { e.preventDefault(); ir(Number(paso.dataset.paso), true); return; }
    var boton = e.target.closest("[data-ir]");
    if (!boton) return;
    e.preventDefault();
    ir(actual + (boton.dataset.ir === "atras" ? -1 : 1), true);
  });

  form.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    if (!e.target.matches("input:not([type=radio]):not([type=checkbox])")) return;
    e.preventDefault();
    if (actual < tramos.length - 1) ir(actual + 1, true);
    else e.target.blur();
  });

  ir(0, false);

  var abre = {
    "fotos-yo": ["fotos-yo"],
    "dia-otro": ["otro-dia"]
  };

  function pintarExtras() {
    var abiertos = [];
    Object.keys(abre).forEach(function (id) {
      var opcion = document.getElementById(id);
      if (opcion && opcion.checked) abiertos = abiertos.concat(abre[id]);
    });
    form.querySelectorAll(".extra").forEach(function (caja) {
      caja.classList.toggle("is-abierto", abiertos.indexOf(caja.dataset.extra) !== -1);
    });
  }

  form.addEventListener("change", pintarExtras);

  var ordenMeta = [];

  form.addEventListener("change", function (e) {
    if (!e.target.matches('input[name="meta"]')) return;
    ordenMeta = ordenMeta.filter(function (c) { return c !== e.target; });
    if (e.target.checked) ordenMeta.push(e.target);
    while (ordenMeta.length > 2) ordenMeta.shift().checked = false;
  });

  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var SIN_DOMINGO = true;
  var DESDE_DIA = 3;   // el primer día de la tira: "web en tres días"

  function escribirDias() {
    var tira = form.querySelector("[data-dias]");
    var otro = tira ? tira.querySelector(".turno--otro") : null;
    if (!tira || !otro) return;
    var hoy = new Date();
    var puestos = 0;
    for (var i = 0; puestos < 7 && i < DESDE_DIA + 9; i++) {
      var d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
      var cerrado = i < DESDE_DIA;
      if (!cerrado && SIN_DOMINGO && d.getDay() === 0) continue;
      if (!cerrado) puestos++;
      var label = document.createElement("label");
      label.className = "turno turno--dia" + (cerrado ? " turno--cerrado" : "");
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "dia";
      radio.disabled = cerrado;
      radio.value = "el " + DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()];
      var texto = document.createElement("span");
      texto.innerHTML = "<small></small><b></b>";
      texto.querySelector("small").textContent = DIAS_CORTOS[d.getDay()];
      texto.querySelector("b").textContent = String(d.getDate());
      label.appendChild(radio);
      label.appendChild(texto);
      tira.insertBefore(label, otro);
    }
    tira.dataset.escrita = "";
    tira.scrollLeft = 0;
    requestAnimationFrame(function () { tira.scrollLeft = 0; });
  }

  function escribirPlazo() {
    var hueco = form.querySelector("[data-plazo]");
    if (!hueco) return;
    var hoy = new Date();
    var d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + DESDE_DIA);
    hueco.textContent = "Nos lo mandas hoy y el " + DIAS[d.getDay()] + " " + d.getDate() + " ya está lista.";
  }

  escribirDias();
  escribirPlazo();
  pintarExtras();

  var negocio = form.dataset.negocio || "";

  if (negocio) {
    form.querySelectorAll("[data-ficha]").forEach(function (hueco) {
      hueco.textContent = "la ficha de Google de " + negocio;
    });
  }

  var servicios = form.dataset.servicios || "servicios";
  var galeria = form.dataset.galeria || "galería de fotos";

  function marcado(id) {
    var el = document.getElementById(id);
    return !!(el && el.checked);
  }

  function piezas(tu) {
    var mis = tu ? "tus" : "mis";
    var mi = tu ? "tu" : "mi";
    var lista = ["portada con " + mis + " " + servicios];

    if (marcado("cita-reservas")) lista.push("botón de cita que lleva a " + mi + " Booksy o Treatwell");
    else if (marcado("meta-cita")) lista.push("botón de WhatsApp para pedir cita sin " + (tu ? "llamarte" : "llamarme"));
    else lista.push("botón de WhatsApp para pedir cita");

    if (marcado("meta-precios")) lista.push("precios a la vista");
    if (marcado("meta-trabajo")) lista.push(galeria.replace(" de fotos", "") + " con " + origenFotos(tu));
    if (marcado("meta-google")) lista.push("ficha preparada para Google, con horario y cómo llegar");
    else if (marcado("meta-donde")) lista.push("horario y cómo llegar a un toque");

    var alguna = casillas("meta").some(function (c) { return c.checked; });
    if (!alguna) lista.push("lo que veamos que " + (tu ? "te" : "me") + " hace falta");
    return lista;
  }

  function origenFotos(tu) {
    var mis = tu ? "tus" : "mis";
    var mi = tu ? "tu" : "mi";
    if (marcado("fotos-instagram")) return mis + " fotos de Instagram";
    if (marcado("fotos-google")) return "las fotos de " + mi + " ficha de Google";
    if (marcado("fotos-facebook")) return mis + " fotos de Facebook";
    if (marcado("fotos-reservas")) return "las fotos de " + mi + " página de reservas";
    if (marcado("fotos-yo")) return "las fotos que " + (tu ? "nos mandes" : "os mando");
    return "las fotos que " + (tu ? "encontremos" : "encontréis");
  }

  function fraseVisita() {
    var turno = valor("turno");
    var dia = valor("dia");
    if (dia === "otro") dia = valor("dia-texto");
    if (turno === "a cualquier hora") turno = "";
    if (!dia) return "Te la enseñamos en tres días, el día que nos digas" + (turno ? ", " + turno : "") + ".";
    dia = dia.charAt(0).toLowerCase() + dia.slice(1);
    return "Te la enseñamos " + dia + (turno ? ", " + turno : "") + ".";
  }

  function pintarResumen() {
    var hueco = form.querySelector("[data-resumen]");
    if (!hueco) return;
    var web = enumerar(piezas(true));
    hueco.textContent = web.charAt(0).toUpperCase() + web.slice(1) + ". " + fraseVisita();
  }

  form.addEventListener("change", pintarResumen);
  form.addEventListener("input", function (e) {
    if (e.target.id === "dia-texto") pintarResumen();
  });
  pintarResumen();

  var muestra = "";
  document.querySelectorAll(".muestra-dialogo [data-cierra]").forEach(function (a) {
    a.addEventListener("click", function () {
      var nombre = document.querySelector(".muestra-dialogo__nombre");
      muestra = nombre ? nombre.textContent.trim() : "";
    });
  });

  function valor(nombre) {
    var el = form.elements[nombre];
    return el ? String(el.value || "").replace(/\s+/g, " ").trim() : "";
  }

  function casillas(nombre) {
    return Array.prototype.slice.call(
      form.querySelectorAll('input[type="checkbox"][name="' + nombre + '"]'));
  }

  function marcadas(nombre) {
    return casillas(nombre)
      .filter(function (el) { return el.checked; })
      .map(function (el) { return el.value; });
  }

  function enumerar(cosas) {
    if (cosas.length < 2) return cosas.join("");
    return cosas.slice(0, -1).join(", ") + " y " + cosas[cosas.length - 1];
  }

  function grupo(rotulo, deQue, nombre, siNada) {
    var elegidas = casillas(nombre).some(function (el) {
      return el.checked && !el.disabled;
    });
    var nota = valor(nombre + "-nota");
    var lineas = [];
    if (elegidas) lineas.push("*" + rotulo + ":* " + enumerar(marcadas(nombre)));
    else if (!nota) lineas.push("*" + rotulo + ":* " + siNada);
    if (nota) lineas.push("*Nota sobre " + deQue + ":* " + nota);
    return lineas;
  }

  function componer() {
    var saludo = valor("text") || "Hola, quiero que me preparéis la web.";
    var renglones = [];

    if (negocio) renglones.push("*Negocio:* " + negocio);

    var cita = valor("cita");
    if (cita) renglones.push("*Cómo me piden cita hoy:* " + cita);
    renglones = renglones.concat(grupo("Lo que quiero", "lo que quiero", "meta", "decididlo vosotros"));

    renglones = renglones.concat(grupo("Fotos", "las fotos", "fotos", "buscadlas vosotros"));

    renglones.push("*Datos:* los de mi ficha de Google");

    var turno = valor("turno");
    var dia = valor("dia");
    if (dia === "otro") dia = valor("dia-texto");
    if (turno || dia) {
      renglones.push("*Visita:* " + [dia || "día por concretar", turno].filter(Boolean).join(", "));
    }

    renglones.push("*Mi web:* " + enumerar(piezas(false)));

    if (muestra) renglones.push("*Diseño que me gusta:* " + muestra);

    return renglones.length ? saludo + "\n\n" + renglones.join("\n") : saludo;
  }

  if (destino.indexOf("https://wa.me/") === 0) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var url = destino + "?text=" + encodeURIComponent(componer());
      window.open(url, "_blank", "noopener");
      if (estado) estado.hidden = false;
    });
  }
})();
