(() => {
  "use strict";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const blocks = [...document.querySelectorAll(".reveal")];
  const show = (el) => el.classList.add("is-visible");

  const onMedia = (mql, fn) => {
    if (mql.addEventListener) mql.addEventListener("change", fn);
    else mql.addListener(fn);
  };

  if (reduced.matches || !("IntersectionObserver" in window)) {
    blocks.forEach(show);
  } else {
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          reveal.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
    );

    blocks.forEach((el) => {
      reveal.observe(el);

      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) requestAnimationFrame(() => show(el));
    });
  }

  const dialogo = document.querySelector(".muestra-dialogo");
  if (dialogo && typeof dialogo.showModal === "function") {
    const imagen = dialogo.querySelector(".muestra-dialogo__imagen");
    const nombre = dialogo.querySelector(".muestra-dialogo__nombre");
    const sector = dialogo.querySelector(".muestra-dialogo__sector");
    let origen = null;

    document.querySelectorAll("[data-muestra]").forEach((enlace) => {
      enlace.addEventListener("click", (e) => {
        e.preventDefault();
        const img = enlace.querySelector("img");
        origen = enlace;
        imagen.src = enlace.getAttribute("href");
        imagen.alt = img ? img.alt : "";
        nombre.textContent = enlace.dataset.nombre || "";
        sector.textContent = enlace.dataset.sector || "";
        dialogo.showModal();
      });
    });

    const cerrar = () => {
      if (dialogo.open) dialogo.close();
    };
    dialogo.querySelector(".muestra-dialogo__cerrar").addEventListener("click", cerrar);
    dialogo.querySelectorAll("[data-cierra]").forEach((a) => a.addEventListener("click", cerrar));
    dialogo.addEventListener("click", (e) => {
      if (e.target === dialogo) cerrar();
    });
    dialogo.addEventListener("close", () => {
      imagen.removeAttribute("src");
      if (origen) origen.focus({ preventScroll: true });
    });
  }

  const nav = document.querySelector(".site-nav");
  const navToggle = document.getElementById("navToggle");

  if (nav && navToggle) {
    const setMenu = (open) => {
      if (open) nav.dataset.menu = "open";
      else delete nav.dataset.menu;
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    };

    navToggle.addEventListener("click", () => {
      setMenu(nav.dataset.menu !== "open");
    });

    nav.querySelectorAll(".site-nav__links a").forEach((a) => {
      a.addEventListener("click", () => setMenu(false));
    });

    addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || nav.dataset.menu !== "open") return;
      setMenu(false);
      navToggle.focus();
    });

    document.addEventListener("click", (e) => {
      if (nav.dataset.menu !== "open" || nav.contains(e.target)) return;
      setMenu(false);
    });

    onMedia(matchMedia("(min-width: 769px)"), (e) => {
      if (e.matches) setMenu(false);
    });
  }

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  let viajero = null;

  document.querySelectorAll('a[href="demo-gratis.html"]').forEach((a) => {
    const pieza = a.matches("[data-viaja]") ? a : a.querySelector("[data-viaja]");
    if (!pieza) return;
    a.addEventListener("click", () => {
      if (viajero) viajero.style.viewTransitionName = "";
      pieza.style.viewTransitionName = "llamada";
      viajero = pieza;
    });
  });

  const demoForm = document.querySelector(".contact__form");
  const destino = demoForm ? demoForm.getAttribute("action") || "" : "";

  if (demoForm && destino.startsWith("https://wa.me/")) {
    const campos = Array.from(demoForm.elements).filter((el) => el.name);
    const estado = demoForm.querySelector(".form__estado");

    demoForm.noValidate = true;

    const revisar = (el) => {
      const caja = el.closest(".field");
      let aviso = caja.querySelector(".field__error");
      const mal = !el.validity.valid;

      caja.classList.toggle("field--error", mal);
      if (mal) el.setAttribute("aria-invalid", "true");
      else el.removeAttribute("aria-invalid");

      if (!mal) {
        if (aviso) aviso.remove();
        el.removeAttribute("aria-describedby");
        return true;
      }

      if (!aviso) {
        aviso = document.createElement("p");
        aviso.className = "field__error";
        aviso.id = el.id + "-error";
        caja.append(aviso);
        el.setAttribute("aria-describedby", aviso.id);
      }
      aviso.textContent = el.validity.valueMissing
        ? "Esto nos hace falta"
        : "Revisa que esté bien escrito";
      return false;
    };

    const SALUDO = "Hola, quiero empezar mi mes gratis.";
    const rotuloDe = (el) => el.dataset.mensaje || el.name;
    const valorDe = (el) =>
      el.tagName === "SELECT"
        ? (el.value ? el.selectedOptions[0].text : "")
        : el.value.trim().replace(/\s*\n\s*/g, "\n");

    const mensajeCaja = demoForm.querySelector(".mensaje");
    const globo = mensajeCaja ? mensajeCaja.querySelector(".mensaje__globo") : null;
    let pintar = () => {};

    if (globo) {
      const saludo = document.createElement("p");
      saludo.className = "mensaje__saludo";
      saludo.textContent = SALUDO;

      const datos = document.createElement("dl");
      datos.className = "mensaje__datos";

      const filas = campos.map((el) => {
        const fila = document.createElement("div");
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        fila.className = "mensaje__dato";
        dt.textContent = rotuloDe(el) + ":";
        fila.append(dt, " ", dd);
        datos.append(fila);
        return { el, fila, dd };
      });

      const hora = document.createElement("span");
      hora.className = "mensaje__hora";
      hora.setAttribute("aria-hidden", "true");

      pintar = () => {
        filas.forEach(({ el, fila, dd }) => {
          const valor = valorDe(el);
          fila.hidden = !valor && !el.required;
          fila.classList.toggle("is-vacio", !valor);
          dd.textContent = valor || "…";
        });
        hora.textContent = new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      globo.append(saludo, datos, hora);
      pintar();
      mensajeCaja.hidden = false;

      const aparte = document.querySelector(".contact__aside");
      const pie = demoForm.querySelector(".form__foot");
      const ancho = matchMedia("(min-width: 769px)");
      const colocar = () => {
        if (ancho.matches && aparte) aparte.prepend(mensajeCaja);
        else if (pie) pie.before(mensajeCaja);
      };
      colocar();
      onMedia(ancho, colocar);

      addEventListener("pageshow", pintar);
    }

    campos.forEach((el) => {
      el.addEventListener("input", () => {
        if (el.hasAttribute("aria-invalid")) revisar(el);
        pintar();
      });
      el.addEventListener("change", pintar);
    });

    demoForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const malos = campos.filter((el) => !revisar(el));
      if (malos.length) {
        if (estado) estado.hidden = true;
        malos[0].focus();
        return;
      }

      const renglones = campos
        .filter((el) => valorDe(el))
        .map((el) => "*" + rotuloDe(el) + ":* " + valorDe(el));

      const mensaje = SALUDO + "\n\n" + renglones.join("\n");

      open(destino + "?text=" + encodeURIComponent(mensaje), "_blank", "noopener");

      if (estado) estado.hidden = false;
    });
  }

  const header = document.querySelector(".site-header");

  if (header && "IntersectionObserver" in window) {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:var(--centinela-alto, 1px);pointer-events:none;";
    document.body.prepend(sentinel);

    new IntersectionObserver(([entry]) => {
      header.dataset.scrolled = String(!entry.isIntersecting);
    }).observe(sentinel);
  }

  const pill = document.getElementById("navPill");
  const pillCursor = pill && pill.querySelector(".nav-pill__cursor");
  const pillLinks = pill ? [...pill.querySelectorAll(".nav-pill__link")] : [];
  const pillWide = matchMedia("(min-width: 769px)");

  const movePill = (link) => {
    if (!pillCursor) return;

    const on = link && pillWide.matches ? link : null;
    pillLinks.forEach((a) => {
      if (a === on) a.setAttribute("data-on", "");
      else a.removeAttribute("data-on");
    });

    if (!on) {
      pill.dataset.cursor = "off";
      return;
    }

    const apagado = pill.dataset.cursor !== "on";
    if (apagado) pillCursor.style.transition = "none";

    const rail = pill.getBoundingClientRect();
    const tab = on.getBoundingClientRect();

    pill.style.setProperty("--pill-x", tab.left - rail.left - pill.clientLeft + "px");
    pill.style.setProperty("--pill-w", tab.width + "px");

    if (apagado) {
      pillCursor.getBoundingClientRect();   // fuerza el cálculo antes de seguir
      pillCursor.style.transition = "";
    }

    pill.dataset.cursor = "on";
  };

  const syncPill = () =>
    movePill(pillLinks.find((a) => a.hasAttribute("aria-current")) || null);

  if (pillCursor) {
    pillLinks.forEach((link) => {
      link.addEventListener("pointerenter", () => movePill(link));
      link.addEventListener("focus", () => movePill(link));
    });

    pill.addEventListener("pointerleave", syncPill);
    pill.addEventListener("focusout", (e) => {
      if (!pill.contains(e.relatedTarget)) syncPill();
    });

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncPill);
    else syncPill();

    addEventListener("resize", syncPill);
    onMedia(pillWide, syncPill);
  }

  const links = [...document.querySelectorAll('.site-nav__links a[href^="#"]')];

  const vigiladas = new Map();

  links.forEach((a) => {
    const href = a.getAttribute("href");
    const seccion = document.querySelector(href);
    if (seccion) vigiladas.set(seccion, href);
  });

  document.querySelectorAll("[data-nav]").forEach((seccion) => {
    const href = seccion.dataset.nav;
    if (href === "none") vigiladas.set(seccion, null);
    else if (links.some((a) => a.getAttribute("href") === href)) vigiladas.set(seccion, href);
  });

  if (vigiladas.size && "IntersectionObserver" in window) {
    const setCurrent = (href) => {
      links.forEach((a) => {
        const on = a.getAttribute("href") === href;
        if (on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
      syncPill();
    };

    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(vigiladas.get(entry.target));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    vigiladas.forEach((_, seccion) => spy.observe(seccion));
  }

  if (!CSS.supports("animation-timeline: scroll()")) {
    const escenario = document.querySelector(".hero__stage");
    const heroDeriva = document.querySelector(".hero");
    const telon = document.querySelector(".cortina");

    if (escenario && heroDeriva) {
      const rapidas = [".hero__foto", ".hero__nombres", ".hero__lema"];   // nombres y línea de oficio van con la foto
      const lentas = [".hero__marca"];
      const capas = (grupo) =>
        grupo.map((sel) => document.querySelector(sel)).filter(Boolean);

      const mando = (nombre) =>
        parseFloat(getComputedStyle(heroDeriva).getPropertyValue(nombre)) || 0;

      const gancho = document.querySelector(".hero__lema-gancho");

      let pedido = false;

      const pintar = () => {
        pedido = false;
        const alto = escenario.clientHeight || 1;
        const avance = Math.min(1, Math.max(0, scrollY / alto));
        const empuje = (cqh) =>
          "translate3d(0, " + (-avance * cqh * alto / 100).toFixed(2) + "px, 0)";

        const calle = empuje(mando("--deriva-calle"));
        const rotulo = empuje(mando("--deriva-rotulo"));
        capas(rapidas).forEach((el) => { el.style.transform = calle; });
        capas(lentas).forEach((el) => { el.style.transform = rotulo; });

        const tramo = mando("--velo-recorrido") || 1;
        escenario.style.setProperty("--velo", Math.min(1, avance / tramo).toFixed(3));
        if (gancho) gancho.style.visibility = avance >= tramo ? "hidden" : "";

        if (telon) {
          telon.style.setProperty(
            "--faldon",
            Math.min(1, avance * (mando("--borde-ritmo") || 1)).toFixed(4)
          );
        }
      };

      const alPasar = () => {
        if (reduced.matches || pedido) return;
        pedido = true;
        requestAnimationFrame(pintar);
      };

      addEventListener("scroll", alPasar, { passive: true });
      addEventListener("resize", alPasar);
      alPasar();

      onMedia(reduced, () => {
        if (!reduced.matches) { alPasar(); return; }
        capas(rapidas).concat(capas(lentas)).forEach((el) => {
          el.style.transform = "";
        });
        escenario.style.removeProperty("--velo");
        if (gancho) gancho.style.visibility = "";
        if (telon) telon.style.removeProperty("--faldon");
      });
    }
  }

})();
