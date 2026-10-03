(function () {
  "use strict";

  var form = document.querySelector("form.preparar");
  if (!form) return;

  var destino = form.getAttribute("action") || "";
  var tramos = Array.prototype.slice.call(form.querySelectorAll(".tramo"));
  var pasos = Array.prototype.slice.call(form.querySelectorAll(".progreso li"));
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
    tira.scrollLeft = 0;
    requestAnimationFrame(function () { tira.scrollLeft = 0; });
  }

  function escribirPlazo() {
    var hueco = form.querySelector("[data-plazo]");
    if (!hueco) return;
    var hoy = new Date();
    var d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + DESDE_DIA);
    if (SIN_DOMINGO && d.getDay() === 0) d.setDate(d.getDate() + 1);
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

  var pasoDatos = form.querySelector(".tramo--datos");
  var camposDatos = pasoDatos
    ? Array.prototype.slice.call(pasoDatos.querySelectorAll("[data-original]"))
    : [];

  if (pasoDatos) {
    var corregir = pasoDatos.querySelector("[data-corregir]");
    var seguir = pasoDatos.querySelector('[data-ir="siguiente"] span');
    if (corregir) {
      corregir.addEventListener("click", function () {
        pasoDatos.classList.add("is-corrigiendo");
        if (seguir) seguir.textContent = "Guardar y seguir";
        if (camposDatos[0]) camposDatos[0].focus();
      });
    }
  }

  function cambiosDatos() {
    return camposDatos.filter(function (campo) {
      return campo.value.trim() !== campo.dataset.original;
    }).map(function (campo) {
      return campo.dataset.dice + " " + (campo.value.trim() || "(lo he dejado vacío)");
    });
  }

  function lineaDatos() {
    if (!pasoDatos) return "*Datos:* los de mi ficha de Google";
    var cambios = cambiosDatos();
    return cambios.length
      ? "*Mis datos, corregidos:* " + cambios.join("; ")
      : "*Mis datos:* están bien como los tenéis";
  }

  function mayuscula(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function rotulos(nombre) {
    return Array.prototype.slice.call(
      form.querySelectorAll('input[name="' + nombre + '"]:checked')
    ).map(function (el) {
      var label = el.closest("label");
      var span = label ? label.querySelector("span") : null;
      return span ? span.textContent.replace(/\s+/g, " ").trim() : el.value;
    });
  }

  function pintarResumen() {
    var caja = form.querySelector("[data-resumen]");
    if (!caja) return;
    var filas = [];

    if (pasoDatos) {
      var cambios = cambiosDatos();
      filas.push(["Tus datos", cambios.length ? cambios.map(mayuscula) : ["Están bien"], ""]);
    }
    filas.push(["Cita hoy", rotulos("cita"), "Sin contestar"]);
    filas.push(["Prioridad", rotulos("meta"), "Lo decidimos nosotros"]);
    filas.push(["Fotos", rotulos("fotos"), "Las buscamos nosotros"]);
    filas.push(["¿Sales tú?", rotulos("sales"), "Sin contestar"]);

    var turno = valor("turno");
    var dia = valor("dia");
    if (dia === "otro") dia = valor("dia-texto");
    if (turno === "a cualquier hora") turno = "";
    filas.push(["Visita", dia ? [mayuscula(dia) + (turno ? ", " + turno : "")] : [],
      "Día por concretar" + (turno ? ", " + turno : "")]);

    caja.textContent = "";
    filas.forEach(function (fila) {
      var div = document.createElement("div");
      div.className = "datos__fila";
      var dt = document.createElement("dt");
      dt.textContent = fila[0];
      var dd = document.createElement("dd");
      var respuestas = fila[1].length ? fila[1] : [fila[2]];
      if (!fila[1].length) dd.className = "datos__vacio";
      respuestas.forEach(function (texto) {
        var renglon = document.createElement("span");
        renglon.textContent = texto;
        dd.appendChild(renglon);
      });
      div.appendChild(dt);
      div.appendChild(dd);
      caja.appendChild(div);
    });
  }

  form.addEventListener("change", pintarResumen);
  form.addEventListener("input", pintarResumen);
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
    renglones = renglones.concat(grupo("Prioridad", "la prioridad", "meta", "decididlo vosotros"));

    renglones = renglones.concat(grupo("Fotos", "las fotos", "fotos", "buscadlas vosotros"));

    var sales = valor("sales");
    if (sales) renglones.push("*En la web:* " + sales);

    renglones.push(lineaDatos());

    var turno = valor("turno");
    var dia = valor("dia");
    if (dia === "otro") dia = valor("dia-texto");
    if (turno || dia) {
      renglones.push("*Visita:* " + [dia || "día por concretar", turno].filter(Boolean).join(", "));
    }

    if (muestra) renglones.push("*Diseño que me gusta:* " + muestra);

    return renglones.length ? saludo + "\n\n" + renglones.join("\n") : saludo;
  }

  var enlaces = Array.prototype.slice.call(form.querySelectorAll("[data-enviar]"));
  var base = destino.indexOf("https://wa.me/") === 0 ? destino : "";

  function escribirEnlaces() {
    if (!base) return;
    var url = base + "?text=" + encodeURIComponent(componer());
    enlaces.forEach(function (a) { a.href = url; });
  }

  form.addEventListener("change", escribirEnlaces);
  form.addEventListener("input", escribirEnlaces);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var final = form.querySelector("[data-final]");
    if (final) final.click();
  });

  var hecho = form.querySelector(".form__hecho");
  var final = form.querySelector("[data-final]");
  var rotulo = final ? final.querySelector("[data-rotulo]") : null;
  var aviso = form.querySelector("[data-aviso]");

  enlaces.forEach(function (a) {
    a.addEventListener("click", function () {
      escribirEnlaces();   // el handler corre antes de navegar: el href va al día
      if (final && rotulo) {
        final.classList.add("is-abriendo");
        rotulo.textContent = "Abriendo WhatsApp…";
      }
      setTimeout(function () {
        ir(tramos.length - 1, false);
        if (final && rotulo) {
          final.classList.remove("is-abriendo");
          rotulo.textContent = "Volver a abrir WhatsApp";
        }
        if (aviso) aviso.textContent = "Ya está en WhatsApp: dale a enviar allí.";
        if (hecho) {
          hecho.hidden = false;
          hecho.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 1200);
    });
  });

  var copiar = form.querySelector("[data-copiar]");
  if (copiar && navigator.clipboard) {
    copiar.addEventListener("click", function () {
      navigator.clipboard.writeText(componer()).then(function () {
        copiar.textContent = "Copiado";
        setTimeout(function () { copiar.textContent = "Copiar el mensaje"; }, 2000);
      }, function () {
        copiar.textContent = "No se ha podido copiar";
      });
    });
  } else if (copiar) {
    copiar.hidden = true;
  }

  escribirEnlaces();
})();
