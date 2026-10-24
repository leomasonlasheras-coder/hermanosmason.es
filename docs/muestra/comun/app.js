(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const movil = window.matchMedia('(max-width: 41.99rem)');
  const grabando = new URLSearchParams(location.search).has('grabar');
  if (grabando) document.documentElement.classList.add('grabando');

  const arrancar = () => document.body.classList.add('cargado');
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(arrancar);
    setTimeout(arrancar, 1000);
  } else {
    arrancar();
  }

  const cabecera = document.querySelector('.cabecera');
  const vigilarCabecera = () => {
    if (cabecera) cabecera.classList.toggle('compacta', window.scrollY > 40);
  };

  const entradas = document.querySelectorAll('.aparece');
  if (entradas.length && 'IntersectionObserver' in window) {
    const vigia = new IntersectionObserver((lote, obs) => {
      lote.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('visible');
        obs.unobserve(entrada.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    entradas.forEach((el) => vigia.observe(el));
  } else {
    entradas.forEach((el) => el.classList.add('visible'));
  }

  const desfasados = Array.from(document.querySelectorAll('[data-velocidad]'));
  const visibles = new Set();
  const actual = new WeakMap();

  const velocidadDe = (el) => {
    const base = parseFloat(el.dataset.velocidad);
    if (Number.isNaN(base)) return 1;
    if (!movil.matches) return base;
    const propia = parseFloat(el.dataset.velocidadMovil);
    if (!Number.isNaN(propia)) return propia;
    return 1 + (base - 1) * 0.5;
  };

  const pintarDesfase = () => {
    const centro = window.innerHeight / 2;
    visibles.forEach((el) => {
      const v = velocidadDe(el);
      if (v === 1) {
        if (actual.get(el)) { actual.set(el, 0); el.style.setProperty('--desfase', '0px'); }
        return;
      }
      const caja = el.getBoundingClientRect();
      const antes = el.dataset.eje === 'x' ? 0 : (actual.get(el) || 0);
      const centroNatural = caja.top - antes + caja.height / 2;
      const desfase = (centroNatural - centro) * (v - 1);
      actual.set(el, desfase);
      el.style.setProperty('--desfase', `${desfase.toFixed(1)}px`);
    });
  };

  if (desfasados.length && !sinMovimiento && 'IntersectionObserver' in window) {
    const vigia = new IntersectionObserver((lote) => {
      lote.forEach((entrada) => {
        entrada.isIntersecting ? visibles.add(entrada.target) : visibles.delete(entrada.target);
      });
      pedir();
    }, { rootMargin: '40% 0px 40% 0px' });
    desfasados.forEach((el) => vigia.observe(el));
  }

  const frases = Array.from(document.querySelectorAll('[data-frase]'));
  frases.forEach((frase) => {
    const texto = frase.textContent.trim().split(/\s+/);
    frase.textContent = '';
    texto.forEach((palabra, i) => {
      const span = document.createElement('span');
      span.className = 'palabra';
      span.style.setProperty('--i', i);
      span.textContent = palabra;
      frase.append(span, ' ');
    });
    frase.style.setProperty('--n', texto.length);
  });

  const pintarFrases = () => {
    const alto = window.innerHeight;
    frases.forEach((frase) => {
      const seccion = frase.closest('section') || frase;
      const caja = frase.getBoundingClientRect();
      const inicio = alto * 0.85;
      const fin = alto * 0.35 - caja.height / 2;
      const p = (inicio - caja.top) / (inicio - fin);
      seccion.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
    });
  };

  const anclados = Array.from(document.querySelectorAll('[data-anclado]'));
  const pintarAnclados = () => {
    const alto = window.innerHeight;
    anclados.forEach((el) => {
      const caja = el.getBoundingClientRect();
      const recorrido = caja.height - alto * 0.8;
      const p = recorrido > 0 ? (alto * 0.1 - caja.top) / recorrido : 0;
      el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
    });
  };

  const punteroFino = window.matchMedia('(pointer: fine)').matches;
  if (punteroFino && !sinMovimiento && !grabando) {
    const FACTOR = 0.1;
    let destino = window.scrollY;
    let posicion = window.scrollY;
    let escrita = window.scrollY; // lo último que escribimos nosotros
    let animando = false;

    const tope = () => document.documentElement.scrollHeight - window.innerHeight;

    const paso = () => {
      if (Math.abs(window.scrollY - escrita) > 1.5) {
        posicion = destino = window.scrollY;
        animando = false;
        return;
      }
      const resto = destino - posicion;
      if (Math.abs(resto) < 0.5) {
        posicion = destino;
        animando = false;
      } else {
        posicion += resto * FACTOR;
      }
      escrita = Math.round(posicion);
      window.scrollTo({ top: posicion, behavior: 'instant' });
      if (animando) requestAnimationFrame(paso);
    };

    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;
      const tira = e.target.closest && e.target.closest('.trabajos__muro');
      if (tira && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 16
        : e.deltaMode === 2 ? e.deltaY * window.innerHeight
        : e.deltaY;
      if (!animando) {
        posicion = escrita = window.scrollY;
        destino = posicion;
      }
      destino = Math.max(0, Math.min(tope(), destino + delta));
      if (!animando) {
        animando = true;
        requestAnimationFrame(paso);
      }
    }, { passive: false });
  }

  let pedido = false;
  const pintar = () => {
    pedido = false;
    vigilarCabecera();
    if (!sinMovimiento) {
      pintarDesfase();
      pintarFrases();
      pintarAnclados();
    }
  };

  const pedir = () => {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(pintar);
  };

  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
  movil.addEventListener('change', pedir);
  pintar();

  if (grabando) {
    const raiz = document.documentElement;
    window.grabar = {
      secciones: () => Array.from(document.querySelectorAll('main > section')).map((s) => ({
        nombre: s.className.split(' ')[0],
        top: s.offsetTop,
        alto: s.offsetHeight,
      })),
      tope: () => raiz.scrollHeight - window.innerHeight,
      ir: (y) => {
        window.scrollTo({ top: y, behavior: 'instant' });
        pintar();
      },
      velo: (v) => raiz.style.setProperty('--velo', v),
      avanzar: (ms) => {
        document.getAnimations().forEach((a) => {
          if (a.playState === 'finished') return;
          a.currentTime = (a.currentTime || 0) + ms;
        });
      },
      cargado: () => document.body.classList.contains('cargado'),
    };
  }
})();
