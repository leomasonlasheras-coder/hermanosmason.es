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
    var boton = e.target.closest("[data-ir]");
    if (!boton) return;
    e.preventDefault();
    ir(actual + (boton.dataset.ir === "atras" ? -1 : 1), true);
  });

  form.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    if (!e.target.matches("input:not([type=radio]):not([type=checkbox])")) return;
    if (actual < tramos.length - 1) {
      e.preventDefault();
      ir(actual + 1, true);
    }
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

  escribirDias();
  pintarExtras();

  var negocio = form.dataset.negocio || "";

  if (negocio) {
    form.querySelectorAll("[data-ficha]").forEach(function (hueco) {
      hueco.textContent = "la ficha de Google de " + negocio;
    });
  }

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

  var tocados = {};
  form.addEventListener("change", function (e) {
    if (e.target.name) tocados[e.target.name] = true;
  });

  function comoVenia(nombre) {
    return !tocados[nombre] && casillas(nombre).every(function (el) {
      return el.checked === el.defaultChecked;
    });
  }

  function enumerar(cosas) {
    if (cosas.length < 2) return cosas.join("");
    return cosas.slice(0, -1).join(", ") + " y " + cosas[cosas.length - 1];
  }

  function componer() {
    var saludo = valor("text") || "Hola, quiero que me preparéis la web.";
    var renglones = [];

    if (negocio) renglones.push("*Negocio:* " + negocio);

    var turno = valor("turno");
    var dia = valor("dia");
    if (dia === "otro") dia = valor("dia-texto");
    if (turno || dia) {
      renglones.push("*Visita:* " + [dia || "día por concretar", turno].filter(Boolean).join(", "));
    }

    renglones.push("*Datos:* los de mi ficha de Google");

    var fotos = marcadas("fotos");
    renglones.push("*Fotos:* " + (fotos.length ? enumerar(fotos) : "por decidir"));

    var secciones = marcadas("secciones");
    renglones.push("*Secciones:* " + (secciones.length ? enumerar(secciones) : "solo las que van siempre"));

    if (muestra) renglones.push("*Diseño que me gusta:* " + muestra);

    var sinTocar = [
      ["fotos", "las fotos"],
      ["secciones", "las secciones"]
    ].filter(function (g) { return comoVenia(g[0]); })
      .map(function (g) { return g[1]; });
    if (sinTocar.length) renglones.push("*Dejo como venía:* " + enumerar(sinTocar));

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
