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
    "datos-yo": ["datos"],
    "datos-google": [],
    "fotos-redes": [],
    "fotos-yo": ["fotos-yo"],
    "dia-otro": ["otro-dia"]
  };

  function pintarExtras() {
    var abiertos = [];
    Object.keys(abre).forEach(function (id) {
      var radio = document.getElementById(id);
      if (radio && radio.checked) abiertos = abiertos.concat(abre[id]);
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
  var DESDE_DIA = 7;   // el primer día de la tira: "web en una semana"

  function escribirDias() {
    var tira = form.querySelector("[data-dias]");
    var otro = tira ? tira.querySelector(".turno--otro") : null;
    if (!tira || !otro) return;
    var hoy = new Date();
    var puestos = 0;
    for (var i = DESDE_DIA; puestos < 7 && i < DESDE_DIA + 9; i++) {
      var d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
      if (SIN_DOMINGO && d.getDay() === 0) continue;
      puestos++;
      var label = document.createElement("label");
      label.className = "turno turno--dia";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "dia";
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
  }

  escribirDias();
  pintarExtras();

  var negocio = form.dataset.negocio || "";

  function rotular(svg) {
    if (!svg || !negocio) return;
    var corto = negocio.length > 24 ? negocio.slice(0, 23).trim() + "…" : negocio;
    svg.querySelectorAll(".mini__rotulo").forEach(function (t) { t.textContent = corto; });
    svg.classList.add("mini--con-nombre");
  }

  rotular(form.querySelector(".mini--ficha"));

  function valor(nombre) {
    var el = form.elements[nombre];
    return el ? String(el.value || "").replace(/\s+/g, " ").trim() : "";
  }

  function campos(nombres) {
    return nombres
      .map(function (n) {
        var el = form.elements[n];
        var v = valor(n);
        return v && el ? "*" + (el.dataset.mensaje || n) + ":* " + v : "";
      })
      .filter(Boolean);
  }

  function marcado(id) {
    var el = document.getElementById(id);
    return !!(el && el.checked);
  }

  function componer() {
    var saludo = valor("text") || "Hola, quiero que me preparéis la web.";
    var renglones = [];

    if (negocio) renglones.push("*Negocio:* " + negocio);

    var datos = valor("datos");
    if (datos) renglones.push("*Datos:* " + datos);
    if (marcado("datos-yo")) {
      renglones = renglones.concat(campos(["negocio", "direccion", "telefono", "horario"]));
    }

    var fotos = valor("fotos");
    if (fotos) renglones.push("*Fotos:* " + fotos);

    var estructura = valor("estructura");
    if (estructura) renglones.push("*Cómo se organiza:* " + estructura);

    var turno = valor("turno");
    var dia = valor("dia");
    if (dia === "otro") dia = valor("dia-texto");
    if (turno || dia) {
      renglones.push("*Visita:* " + [turno, dia].filter(Boolean).join(", "));
    }

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
