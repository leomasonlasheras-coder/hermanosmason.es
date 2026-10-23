(function () {
  "use strict";

  var form = document.querySelector("form.preparar");
  if (!form) return;

  var destino = form.getAttribute("action") || "";
  var tramos = Array.prototype.slice.call(form.querySelectorAll(".tramo:not(.tramo--gracias)"));
  var gracias = form.querySelector(".tramo--gracias");
  var bloques = Array.prototype.slice.call(form.querySelectorAll(".progreso li"));
  var actual = 0;
  var terminado = false;   // ya se ha enviado: los bloques del stepper no vuelven

  var REGALO = { negocio: 1 };
  function pasosDe(clave) {
    return tramos.filter(function (t) { return t.dataset.bloque === clave; });
  }

  var CLAVE = "hm-quiz:" + location.pathname;
  var repuesto = false;   // hasta reponer(), guardar() no escribe: el ir(0) de arranque pisaría lo guardado
  function almacenes() {
    var lista = [];
    try { if (window.sessionStorage) lista.push(window.sessionStorage); } catch (e) {}
    try { if (window.localStorage) lista.push(window.localStorage); } catch (e) {}
    return lista;
  }
  function deCampo(el) {
    return el.name && el.type !== "hidden" && el.type !== "submit" && el.type !== "button";
  }
  function guardar() {
    if (!repuesto) return;
    var datos = { paso: actual, campos: {} };
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!deCampo(el)) return;
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked) datos.campos[el.name + "=" + el.value] = true;
      } else if (el.value) {
        datos.campos[el.name] = el.value;
      }
    });
    var texto;
    try { texto = JSON.stringify(datos); } catch (e) { return; }
    almacenes().forEach(function (a) { try { a.setItem(CLAVE, texto); } catch (e) {} });
  }
  function reponer() {
    var texto = null;
    almacenes().some(function (a) {
      try { texto = a.getItem(CLAVE); } catch (e) {}
      return !!texto;
    });
    if (!texto) return 0;
    var datos;
    try { datos = JSON.parse(texto); } catch (e) { return 0; }
    if (!datos || !datos.campos) return 0;
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!deCampo(el)) return;
      if (el.type === "checkbox" || el.type === "radio") {
        if (datos.campos[el.name + "=" + el.value]) el.checked = true;
      } else if (datos.campos[el.name] !== undefined && el.value === (el.dataset.original || "")) {
        el.value = datos.campos[el.name];
      }
    });
    return Number(datos.paso) || 0;
  }
  form.addEventListener("change", guardar);
  form.addEventListener("input", guardar);

  function ir(n, enfocar) {
    actual = Math.max(0, Math.min(tramos.length - 1, n));
    tramos.forEach(function (t, i) { t.hidden = i !== actual; });
    if (gracias) gracias.hidden = true;
    pintarBloques();
    guardar();
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

  function pintarBloques() {
    var bloqueActual = tramos[actual] ? tramos[actual].dataset.bloque : "";
    bloques.forEach(function (li) {
      var clave = li.dataset.bloque;
      var suyos = pasosDe(clave);
      var regalo = REGALO[clave] || 0;
      var hechos = suyos.filter(function (t) { return tramos.indexOf(t) < actual; }).length;
      var total = suyos.length + regalo;
      var esActual = clave === bloqueActual;
      var hecho = suyos.length > 0 && hechos === suyos.length && !esActual;
      var parte = hecho ? 1 : (total ? (hechos + regalo) / total : 0);
      li.style.setProperty("--parte", String(parte));
      li.classList.toggle("is-hecho", hecho);
      li.classList.toggle("is-empezado", !hecho && parte > 0);
      if (esActual) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
      var boton = li.querySelector("[data-bloque-ir]");
      if (boton) boton.disabled = !hecho || terminado;
    });
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
    var bloque = e.target.closest("[data-bloque-ir]");
    if (bloque) {
      e.preventDefault();
      var primero = pasosDe(bloque.dataset.bloqueIr)[0];
      if (primero) mover(tramos.indexOf(primero));
      return;
    }
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

  var fotosNo = document.getElementById("fotos-no");

  form.addEventListener("change", function (e) {
    var casilla = e.target;
    if (!fotosNo || !casilla || casilla.name !== "fotos" || !casilla.checked) return;
    if (casilla === fotosNo) {
      casillas("fotos").forEach(function (otra) {
        if (otra !== fotosNo) otra.checked = false;
      });
    } else {
      fotosNo.checked = false;
    }
  });

  var abre = {
    "fotos-yo": ["fotos-yo"],
    "fotos-instagram": ["fotos-instagram"],
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

  function pintarMarcas() {
    form.querySelectorAll(".casilla, .estilo, .turno").forEach(function (label) {
      var input = label.querySelector("input");
      label.classList.toggle("is-marcada", !!(input && input.checked));
    });
  }

  form.addEventListener("change", pintarMarcas);

  form.addEventListener("touchstart", function () {}, { passive: true });

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

  function diaListo() {
    var hoy = new Date();
    var d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + DESDE_DIA);
    if (SIN_DOMINGO && d.getDay() === 0) d.setDate(d.getDate() + 1);
    return DIAS[d.getDay()] + " " + d.getDate();
  }

  function escribirPlazo() {
    var hueco = form.querySelector("[data-plazo]");
    if (hueco) hueco.textContent = "Nos lo mandas hoy y el " + diaListo() + " ya está lista.";
    var listo = form.querySelector("[data-listo]");
    if (listo) listo.textContent = "El " + diaListo() + " la tienes lista.";
    pintarPlazoCierre();
  }

  escribirDias();
  escribirPlazo();
  var pasoGuardado = reponer();
  repuesto = true;
  if (pasoGuardado) ir(pasoGuardado, false);
  pintarExtras();
  pintarMarcas();

  var negocio = form.dataset.negocio || "";
  var persona = form.dataset.nombre || "";

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
      if (!span) return el.value;
      var texto = Array.prototype.filter.call(span.childNodes, function (n) { return n.nodeType === 3; })
        .map(function (n) { return n.textContent; }).join("");
      return texto.replace(/\s+/g, " ").trim() || el.value;
    });
  }

  function pintarResumen() {
    var caja = form.querySelector("[data-resumen]");
    if (!caja) return;
    var filas = [];

    filas.push(["Clientes", rotulos("llegan"), "Sin contestar"]);
    filas.push(["Citas", rotulos("cita"), "Sin contestar"]);
    filas.push(["Teléfono", rotulos("telefono"), "Sin contestar"]);
    filas.push(["Web antes", rotulos("web-antes"), "Sin contestar"]);
    filas.push(["Para qué", rotulos("para"), "Sin contestar"]);
    filas.push(["Estilo", rotulos("estilo"), "Lo elegimos nosotros"]);
    var instagram = valor("instagram");
    filas.push(["Fotos", rotulos("fotos").map(function (texto) {
      return texto === "De mi Instagram" && instagram ? texto + ", " + instagram : texto;
    }), "Sin contestar"]);
    if (pasoDatos) {
      var cambios = cambiosDatos();
      filas.push(["Tus datos", cambios.length ? cambios.map(mayuscula) : ["Están bien"], ""]);
    } else {
      filas.push(["Tus datos", ["Los de tu ficha de Google Maps"], ""]);
    }

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

  function marcado(nombre, id) {
    var el = document.getElementById(id);
    return !!(el && el.name === nombre && el.checked);
  }

  function tresLineas() {
    var lineas = [];
    var estilo = rotulos("estilo")[0] || "";

    lineas.push(estilo
      ? "Tu web será de estilo " + estilo + ", con " + (negocio ? "el nombre de " + negocio : "tu nombre") + " en la portada."
      : "El estilo lo elegimos nosotros con tus fotos; si no te convence, lo cambiamos en la visita.");

    var telefonoMal = marcado("telefono", "tel-yo") || marcado("telefono", "tel-luego") || marcado("telefono", "tel-nadie");
    if (telefonoMal) {
      lineas.push("Has dicho que el teléfono lo coges como puedes: el botón de WhatsApp va el primero, con tu horario, para que te escriban mientras trabajas.");
    } else if (marcado("cita", "cita-app")) {
      lineas.push("Reservan por tu app: el botón de reservar lleva allí, y la web no te cobra comisión por cada cliente nuevo.");
    } else if (marcado("cita", "cita-whatsapp")) {
      lineas.push("Te piden cita por WhatsApp: el botón de WhatsApp va el primero, con tu horario.");
    } else if (marcado("cita", "cita-llaman")) {
      lineas.push("Te llaman: el botón de llamar va el primero, con tu horario, y el de WhatsApp al lado para cuando no puedas cogerlo.");
    } else {
      lineas.push("Arriba del todo, el botón de WhatsApp, el de llamar y tu horario.");
    }

    if (marcado("llegan", "llegan-recomiendan") || marcado("llegan", "llegan-google")) {
      lineas.push("Cuando te recomienden y te busquen en Google, encontrarán tu web con tus fotos, tus precios y cómo pedir cita.");
    } else if (marcado("llegan", "llegan-instagram") || marcado("web-antes", "web-nunca")) {
      lineas.push("Tu Instagram sigue siendo tuyo: la web lo enlaza y recoge a quien te busca en Google sin conocerte.");
    } else if (marcado("llegan", "llegan-calle")) {
      lineas.push("Quien pase por delante y te busque luego en el móvil te encontrará, con tus fotos y tus precios.");
    } else {
      lineas.push("Con tus fotos, tus precios y cómo pedir cita, abierta 24/7.");
    }

    var renuncia = "No lleva tienda online ni reservas con pago: no te hacen falta.";
    return { lineas: lineas, renuncia: renuncia };
  }

  function pintarPlazoCierre() {
    var hueco = form.querySelector("[data-plazo-cierre]");
    if (!hueco) return;
    var listo = diaListo();
    var dia = valor("dia");
    if (dia === "otro") dia = valor("dia-texto");
    var turno = valor("turno");
    if (turno === "a cualquier hora") turno = "";
    var visita = fraseVisita();
    var mismoDia = dia && dia.indexOf("el " + listo + " de ") === 0;
    var cola = ".";
    if (mismoDia) cola = " y pasamos a enseñártela ese mismo día" + (turno ? ", " + turno : "") + ".";
    else if (visita) cola = ", y pasamos a enseñártela " + visita + ".";
    hueco.textContent = "El " + listo + " la tienes lista" + cola;
  }

  function pintarTresLineas() {
    var caja = form.querySelector("[data-tres-lineas]");
    if (!caja) return;
    var r = tresLineas();
    caja.textContent = "";
    r.lineas.forEach(function (texto) {
      var li = document.createElement("li");
      li.textContent = texto;
      caja.appendChild(li);
    });
    var renuncia = document.createElement("li");
    renuncia.className = "tres-lineas__renuncia";
    renuncia.textContent = r.renuncia;
    caja.appendChild(renuncia);
    pintarPlazoCierre();
  }

  form.addEventListener("change", pintarTresLineas);
  form.addEventListener("input", pintarTresLineas);
  pintarTresLineas();

  var capa = form.querySelector("#capa-datos");
  form.querySelectorAll("[data-abrir-capa]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (!capa) return;
      e.preventDefault();
      capa.open = true;
      capa.scrollIntoView({ block: "center", behavior: "smooth" });
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

  function fraseVisita() {
    var turno = valor("turno");
    var dia = valor("dia");
    if (dia === "otro") dia = valor("dia-texto");
    var turnoElegido = turno && turno !== "a cualquier hora";
    if (!turnoElegido && !dia) return "";
    return [dia || "día por concretar", turno].filter(Boolean).join(", ");
  }

  function componer() {
    var saludo = valor("text") || "Hola, quiero que me preparéis la web.";
    var lineas = renglones();
    return lineas.length ? saludo + "\n\n" + lineas.join("\n") : saludo;
  }

  function renglones() {
    var renglones = [];

    if (negocio) renglones.push("*Negocio:* " + negocio);

    var llegan = marcadas("llegan");
    if (llegan.length) renglones.push("*Cómo me llegan los clientes:* " + enumerar(llegan));
    var cita = marcadas("cita");
    if (cita.length) renglones.push("*Cómo me piden cita:* " + enumerar(cita));
    var telefono = valor("telefono");
    if (telefono) renglones.push("*El teléfono cuando estoy atendiendo:* " + telefono);
    var webAntes = valor("web-antes");
    if (webAntes) renglones.push("*Web antes:* " + webAntes);

    var para = marcadas("para");
    if (para.length) renglones.push("*Lo que quiero que haga la web:* " + enumerar(para));

    var estilo = valor("estilo");
    if (estilo) renglones.push("*Estilo:* " + estilo);

    var fotos = marcadas("fotos");
    if (fotos.length) renglones.push("*Fotos:* " + enumerar(fotos));
    var instagram = valor("instagram");
    if (instagram && form.querySelector("#fotos-instagram:checked")) {
      renglones.push("*Mi Instagram:* " + instagram);
    }

    renglones.push(lineaDatos());

    var visita = fraseVisita();
    if (visita) renglones.push("*Visita:* " + visita);

    return renglones;
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

  function mostrarHecho() {
    if (!hecho) return;
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
        mostrarHecho();
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

  var primerToque = 0;
  form.addEventListener("change", function () { if (!primerToque) primerToque = Date.now(); }, true);

  function campos() {
    var quien = negocio || persona || "la página " + (form.dataset.pagina || "2");
    var visita = fraseVisita();
    var datos = {
      access_key: recibir,
      subject: visita ? quien + ": visita " + visita : "Cuestionario de " + quien,
      from_name: "hermanosmason.es",
      Nombre: persona || "(sin nombre)",
      Negocio: negocio || "(sin negocio: página de " + (form.dataset.pagina || "sector") + ")",
      Desde: form.dataset.pagina || "",
      Respuestas: renglones().join("\n").replace(/\*/g, ""),
      Consentimiento: "Sí: al tocar \"Empezar mi mes gratis\" acepta que le escribamos por WhatsApp para confirmar la visita",
      Enviado: new Date().toISOString(),
      Tiempo: primerToque ? Math.round((Date.now() - primerToque) / 1000) + " s desde el primer toque hasta el botón" : "(sin tocar nada)"
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
    if (aviso) aviso.textContent = "Ya lo tenemos.";
    terminar();
  }

  var salida = document.querySelector(".salida");
  function despedir(si) {
    if (salida) salida.hidden = si;
  }

  function terminar() {
    terminado = true;
    despedir(true);
    ir(tramos.length - 1, false);
    if (!gracias) { mostrarHecho(); return; }
    tramos.forEach(function (t) { t.hidden = true; });
    bloques.forEach(function (li) {
      li.style.setProperty("--parte", "1");
      li.classList.add("is-hecho");
      li.classList.remove("is-empezado");
      li.removeAttribute("aria-current");
      var boton = li.querySelector("[data-bloque-ir]");
      if (boton) boton.disabled = true;
    });
    gracias.hidden = false;
    var cuando = gracias.querySelector("[data-cuando]");
    if (cuando) cuando.textContent = new Date().getHours() < 20 ? "hoy mismo" : "mañana por la mañana";
    var recibo = gracias.querySelector("[data-recibo]");
    if (recibo) {
      var piezas = [];
      var visita = fraseVisita();
      if (visita) piezas.push("Visita: " + visita);
      var estiloElegido = rotulos("estilo")[0];
      if (estiloElegido) piezas.push("Estilo: " + estiloElegido);
      recibo.textContent = piezas.length ? "Lo que nos has mandado. " + piezas.join(" · ") + "." : "";
      recibo.hidden = !piezas.length;
    }
    var legend = gracias.querySelector("legend");
    if (legend) {
      legend.setAttribute("tabindex", "-1");
      legend.focus({ preventScroll: true });
    }
    if (modo) reposar(gracias);
    else form.scrollIntoView({ block: "start", behavior: "smooth" });
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
    terminado = false;
    despedir(false);
    if (final) final.disabled = false;
    if (rotulo) rotulo.textContent = "Enviar de nuevo";
    if (aviso) aviso.textContent = "Has cambiado algo: envíalo otra vez y nos quedamos con lo último.";
  });
})();

(function () {
  "use strict";

  var video = document.querySelector(".muestra-video__video");
  if (!video || !video.play) return;

  function arrancar() {
    if (!video.paused) return;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  var gestos = ["touchstart", "scroll", "pointerdown", "keydown"];
  function alPrimerGesto() {
    gestos.forEach(function (g) { window.removeEventListener(g, alPrimerGesto); });
    arrancar();
  }
  gestos.forEach(function (g) { window.addEventListener(g, alPrimerGesto, { passive: true }); });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) arrancar();
  });
})();
