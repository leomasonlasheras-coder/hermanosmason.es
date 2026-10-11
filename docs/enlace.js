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
      if (modo) reposar(tramos[actual]);
      else form.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  function reposar(tramo) {
    var cuerpo = tramo.querySelector(".tramo__cuerpo");
    function cero() {
      tramo.scrollTop = 0;
      if (cuerpo) cuerpo.scrollTop = 0;
    }
    cero();
    requestAnimationFrame(cero);
    setTimeout(cero, 300);
  }

  var raiz = document.documentElement;
  var ancho = window.matchMedia ? window.matchMedia("(max-width: 43.75rem)") : null;
  var modo = false;
  var fondo = 0;        // entradas apuntadas en el historial desde que se abrió
  var cerrando = false;

  function aislar(si) {
    var seccion = form.closest("section");
    if (!seccion || !seccion.parentNode) return;
    Array.prototype.forEach.call(seccion.parentNode.children, function (el) {
      if (el !== seccion) el.inert = si;
    });
  }

  function apuntar(paso) {
    fondo++;
    try { history.pushState({ quiz: 1, paso: paso, n: fondo }, ""); } catch (e) {}
  }

  function abrir() {
    if (modo || !ancho || !ancho.matches) return;
    modo = true;
    cerrando = false;
    fondo = 0;
    form.classList.add("is-modo");
    raiz.classList.add("quiz-abierto");
    aislar(true);
    apuntar(actual);
    reposar(tramos[actual]);
  }

  function soltar() {
    if (!modo) return;
    modo = false;
    cerrando = false;
    fondo = 0;
    form.classList.remove("is-modo");
    raiz.classList.remove("quiz-abierto");
    aislar(false);
    form.scrollIntoView({ block: "start" });
  }

  function cerrar() {
    if (!modo) return;
    if (fondo > 0) {
      cerrando = true;
      history.go(-fondo);   // llega un popstate y ahí se suelta
      setTimeout(function () { if (cerrando) soltar(); }, 400);
    } else {
      soltar();
    }
  }

  try {
    var resto = history.state;
    if (resto && resto.quiz && resto.n > 0) history.go(-resto.n);
  } catch (e) {}

  window.addEventListener("popstate", function (e) {
    if (!modo) return;
    var estado = e.state;
    if (!cerrando && estado && estado.quiz) {
      fondo = estado.n || 1;
      ir(estado.paso, true);
    } else {
      soltar();
    }
  });

  function mover(n) {
    n = Math.max(0, Math.min(tramos.length - 1, n));
    if (!modo || n === actual) { ir(n, true); return; }
    if (n > actual) {
      ir(n, true);
      apuntar(n);
    } else if (actual - n < fondo) {
      history.go(n - actual);
    } else {
      ir(n, true);
      try { history.replaceState({ quiz: 1, paso: n, n: fondo }, ""); } catch (e) {}
    }
  }

  document.querySelectorAll('a[href="#preparar"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (!ancho || !ancho.matches) return;
      e.preventDefault();
      abrir();
    });
  });

  var equis = form.querySelector("[data-quiz-cerrar]");
  if (equis) equis.addEventListener("click", cerrar);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modo) cerrar();
  });

  if (ancho && ancho.addEventListener) {
    ancho.addEventListener("change", function () { if (!ancho.matches) cerrar(); });
  }

  form.addEventListener("click", function (e) {
    if (!modo && e.target.closest(".tramo")) abrir();
    var paso = e.target.closest("[data-paso]");
    if (paso) { e.preventDefault(); mover(Number(paso.dataset.paso)); return; }
    var boton = e.target.closest("[data-ir]");
    if (!boton) return;
    e.preventDefault();
    mover(actual + (boton.dataset.ir === "atras" ? -1 : 1));
  });

  form.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    if (!e.target.matches("input:not([type=radio]):not([type=checkbox])")) return;
    e.preventDefault();
    if (actual < tramos.length - 1) mover(actual + 1);
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
    form.querySelectorAll("[data-negocio-muestra]").forEach(function (hueco) {
      hueco.textContent = negocio;
    });
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
      return campo.value.trim() !== (campo.dataset.original || "").trim();
    }).map(function (campo) {
      return campo.dataset.dice + " " + (campo.value.trim() || "(lo he dejado vacío)");
    });
  }

  function lineaDatos() {
    if (!pasoDatos) return "*Datos:* los de mi ficha de Google Maps";
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
    filas.push(["Para qué", rotulos("para"), "Sin contestar"]);
    filas.push(["Estilo", rotulos("estilo"), "Lo elegimos nosotros"]);
    filas.push(["Contenido", rotulos("mostrar"), "Lo decidimos nosotros"]);
    filas.push(["Fotos y logo", rotulos("fotos"), "Sin contestar"]);

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

  function componer() {
    var saludo = valor("text") || "Hola, quiero que me preparéis la web.";
    var renglones = [];

    if (negocio) renglones.push("*Negocio:* " + negocio);

    var para = marcadas("para");
    if (para.length) renglones.push("*Para qué quiero la web:* " + enumerar(para));

    var estilo = valor("estilo");
    if (estilo) renglones.push("*Estilo:* " + estilo);

    var mostrar = marcadas("mostrar");
    if (mostrar.length) renglones.push("*Quiero mostrar:* " + enumerar(mostrar));

    var fotos = valor("fotos");
    if (fotos) renglones.push("*Fotos y logo:* " + fotos);

    renglones.push(lineaDatos());

    var turno = valor("turno");
    var dia = valor("dia");
    if (dia === "otro") dia = valor("dia-texto");
    var turnoElegido = turno && turno !== "a cualquier hora";
    if (turnoElegido || dia) {
      renglones.push("*Visita:* " + [dia || "día por concretar", turno].filter(Boolean).join(", "));
    }

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

  var hecho = form.querySelector(".form__hecho");
  var final = form.querySelector("[data-final]");
  var rotulo = final ? final.querySelector("[data-rotulo]") : null;
  var respaldo = form.querySelector("[data-respaldo]");
  var rotuloRespaldo = respaldo ? respaldo.querySelector("[data-rotulo]") : null;
  var aviso = form.querySelector("[data-aviso]");

  function mostrarHecho(cual) {
    if (!hecho) return;
    Array.prototype.forEach.call(hecho.querySelectorAll("[data-hecho]"), function (bloque) {
      bloque.hidden = bloque.dataset.hecho !== cual;
    });
    hecho.hidden = false;
    hecho.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  enlaces.forEach(function (a) {
    a.addEventListener("click", function () {
      escribirEnlaces();   // el handler corre antes de navegar: el href va al día
      if (respaldo && rotuloRespaldo) {
        respaldo.classList.add("is-abriendo");
        rotuloRespaldo.textContent = "Abriendo WhatsApp…";
      }
      setTimeout(function () {
        ir(tramos.length - 1, false);
        if (respaldo && rotuloRespaldo) {
          respaldo.classList.remove("is-abriendo");
          rotuloRespaldo.textContent = "Volver a abrir WhatsApp";
        }
        if (aviso) aviso.textContent = "Ya está en WhatsApp: dale a enviar allí.";
        mostrarHecho("whatsapp");
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

  var recibir = form.dataset.recibir || "";
  var enviando = false;
  var enviado = false;

  function campos() {
    var datos = {
      access_key: recibir,
      subject: "Cuestionario de " + (negocio || form.dataset.pagina || "la página 2"),
      from_name: "hermanosmason.es",
      Negocio: negocio || "(sin nombre: página de " + (form.dataset.pagina || "sector") + ")",
      Desde: form.dataset.pagina || "",
      Respuestas: componer().replace(/\*/g, "")
    };
    if (form.dataset.responder) datos.Responder = form.dataset.responder;
    return datos;
  }

  function respaldar() {
    escribirEnlaces();
    if (final) final.hidden = true;
    if (respaldo) respaldo.hidden = false;
    if (aviso) aviso.textContent = "No hemos podido recibirlo. Se abre WhatsApp con tus respuestas ya escritas: tú solo le das a enviar.";
    ir(tramos.length - 1, false);
  }

  function recibido() {
    enviado = true;
    if (final) final.disabled = true;
    if (rotulo) rotulo.textContent = "Enviado";
    if (aviso) aviso.textContent = "Ya lo tenemos. Te escribimos por WhatsApp.";
    ir(tramos.length - 1, false);
    mostrarHecho("recibido");
  }

  function mandar() {
    enviando = true;
    if (final) final.classList.add("is-enviando");
    if (rotulo) rotulo.textContent = "Enviando…";
    var controlador = window.AbortController ? new AbortController() : null;
    var reloj = controlador ? setTimeout(function () { controlador.abort(); }, 12000) : 0;
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(campos()),
      signal: controlador ? controlador.signal : undefined
    }).then(function (respuesta) {
      return respuesta.json().then(
        function (json) { return respuesta.ok && !!(json && json.success); },
        function () { return respuesta.ok; }
      );
    }).then(function (bien) {
      if (!bien) throw new Error("Web3Forms no lo ha aceptado");
      recibido();
    }).catch(function () {
      if (rotulo) rotulo.textContent = "Empezar mi mes gratis";
      respaldar();
    }).then(function () {
      clearTimeout(reloj);
      enviando = false;
      if (final) final.classList.remove("is-enviando");
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (enviando || enviado) return;
    if (!recibir || !window.fetch || !final) {
      respaldar();
      return;
    }
    mandar();
  });

  form.addEventListener("change", function () {
    if (!enviado) return;
    enviado = false;
    if (final) final.disabled = false;
    if (rotulo) rotulo.textContent = "Enviar de nuevo";
    if (aviso) aviso.textContent = "Has cambiado algo: envíalo otra vez y nos quedamos con lo último.";
  });
})();
