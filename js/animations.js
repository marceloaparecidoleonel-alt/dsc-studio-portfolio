/**
 * animations.js
 * Deivid Santos — Visualização Arquitetônica
 *
 * Módulo responsável por:
 * - Cursor personalizado
 * - Scroll Reveal (IntersectionObserver)
 * - Parallax suave
 * - Counter animado (números estatísticos)
 * - Skill bars animadas
 * - Barra de progresso de scroll
 */

'use strict';

/* ================================================
   CURSOR PERSONALIZADO
   ================================================ */
const Cursor = (() => {

    const cursor = document.getElementById('custom-cursor');
    const core   = cursor?.querySelector('.cursor-core');
    const trail  = cursor?.querySelector('.cursor-trail');
    const label  = cursor?.querySelector('.cursor-label');

    if (!cursor || !matchMedia('(pointer: fine)').matches) return { init: () => {} };

    let mouseX = 0, mouseY = 0;
    let trailX = 0, trailY = 0;

    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
        /* Core segue o mouse imediatamente */
        core.style.transform  = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
        label.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;

        /* Trail segue com lag suave */
        trailX = lerp(trailX, mouseX, 0.1);
        trailY = lerp(trailY, mouseY, 0.1);
        trail.style.transform = `translate(${trailX}px, ${trailY}px) translate(-50%, -50%)`;

        requestAnimationFrame(tick);
    };

    const hoverSelectors = 'a, button, [role="button"], .filter-btn, .pcard-btn, .tour-card, .portfolio-card, .esp-card, input, textarea, select';

    const setLabel = (el) => {
        if (!el) return;
        if (el.matches('a[href^="#projetos"], .pcard-btn, .portfolio-card, .tour-card')) {
            label.textContent = 'VER';
        } else if (el.matches('a[href^="https://wa.me"], .btn-whatsapp')) {
            label.textContent = 'WA';
        } else if (el.matches('input, textarea, select')) {
            label.textContent = '';
        } else {
            label.textContent = 'VER';
        }
    };

    const init = () => {
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });
        document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });

        document.addEventListener('mouseover', (e) => {
            const el = e.target.closest(hoverSelectors);
            if (el) {
                setLabel(el);
                cursor.classList.add('is-hovering');
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.closest(hoverSelectors)) {
                cursor.classList.remove('is-hovering');
            }
        });

        document.addEventListener('mousedown', () => { cursor.classList.add('is-clicking'); });
        document.addEventListener('mouseup',   () => { cursor.classList.remove('is-clicking'); });

        tick();
    };

    return { init };
})();


/* ================================================
   SCROLL REVEAL — IntersectionObserver
   ================================================ */
const ScrollReveal = (() => {

    const THRESHOLD = 0.15;
    const ROOT_MARGIN = '0px 0px -60px 0px';

    /** Observa elementos [data-reveal] individualmente */
    const observeSingle = () => {
        const elements = document.querySelectorAll('[data-reveal]');
        if (!elements.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: THRESHOLD, rootMargin: ROOT_MARGIN });

        elements.forEach((el) => {
            /* Hero section anima via CSS keyframes — não precisa de ScrollReveal */
            if (el.closest('#home')) return;
            observer.observe(el);
        });
    };

    /** Observa grids para stagger animation */
    const observeGrids = () => {
        const grids = document.querySelectorAll(
            '.especialidades-grid, .diferenciais-grid, .portfolio-grid, .tour-cards-grid, .timeline'
        );
        if (!grids.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        grids.forEach((el) => observer.observe(el));
    };

    const init = () => {
        observeSingle();
        observeGrids();
    };

    return { init };
})();


/* ================================================
   PARALLAX SUAVE
   ================================================ */
const Parallax = (() => {

    /* Somente em desktops para performance */
    if (window.innerWidth < 1024) return { init: () => {} };

    const orbs = [
        { el: document.querySelector('.hero-orb-1'), speed: 0.15 },
        { el: document.querySelector('.hero-orb-2'), speed: 0.25 },
        { el: document.querySelector('.hero-orb-3'), speed: 0.1  },
    ].filter(item => item.el);

    let ticking = false;

    const update = () => {
        const scrollY = window.scrollY;

        orbs.forEach(({ el, speed }) => {
            const offset = scrollY * speed;
            el.style.transform = `translateY(${offset}px)`;
        });

        ticking = false;
    };

    const init = () => {
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    };

    return { init };
})();


/* ================================================
   COUNTER ANIMADO — Números estatísticos
   ================================================ */
const CounterAnimation = (() => {

    const DURATION = 2000; /* ms */
    const EASE_OUT = (t) => 1 - Math.pow(1 - t, 3); /* cubic ease out */

    const animateCounter = (el) => {
        const target = parseInt(el.dataset.count, 10);
        if (!target) return;

        const start = performance.now();

        const step = (now) => {
            const elapsed  = now - start;
            const progress = Math.min(elapsed / DURATION, 1);
            const easedProg = EASE_OUT(progress);
            const current   = Math.floor(easedProg * target);

            el.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = target;
            }
        };

        requestAnimationFrame(step);
    };

    const init = () => {
        const counters = document.querySelectorAll('.stat-number[data-count]');
        if (!counters.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.8 });

        counters.forEach((el) => observer.observe(el));
    };

    return { init };
})();


/* ================================================
   SKILL BARS — Animação de preenchimento
   ================================================ */
const SkillBars = (() => {

    const init = () => {
        const bars = document.querySelectorAll('.skill-bar-fill');
        if (!bars.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const bar = entry.target;
                    const width = bar.dataset.width;
                    bar.classList.add('is-animated');
                    /* Pequeno delay para garantir transição visível */
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            bar.style.width = `${width}%`;
                        });
                    });
                    observer.unobserve(bar);
                }
            });
        }, { threshold: 0.5 });

        bars.forEach((el) => observer.observe(el));
    };

    return { init };
})();


/* ================================================
   SCROLL PROGRESS BAR
   ================================================ */
const ScrollProgress = (() => {

    const createBar = () => {
        const bar = document.createElement('div');
        bar.className = 'scroll-progress';
        document.body.prepend(bar);
        return bar;
    };

    const init = () => {
        const bar = createBar();
        let ticking = false;

        const update = () => {
            const scrollTop  = window.scrollY;
            const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
            const progress   = docHeight > 0 ? scrollTop / docHeight : 0;

            bar.style.transform = `scaleX(${progress})`;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    };

    return { init };
})();


/* ================================================
   INICIALIZAÇÃO DO MÓDULO
   ================================================ */
const AnimationsModule = {
    init() {
        Cursor.init();
        ScrollReveal.init();
        Parallax.init();
        CounterAnimation.init();
        SkillBars.init();
        ScrollProgress.init();
    }
};

export default AnimationsModule;
