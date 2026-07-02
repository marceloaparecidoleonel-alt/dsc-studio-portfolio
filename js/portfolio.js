/**
 * portfolio.js
 * Deivid Santos — Visualização Arquitetônica
 *
 * Módulo responsável por:
 * - Carregamento dinâmico de projetos do Firestore
 * - Filtro de categorias do portfólio
 * - Modal premium de projetos
 * - Slider de depoimentos
 */

'use strict';

import { initializeApp, getApps, getApp }          from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy, onSnapshot }
    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import PanoramaModule from './panorama.js';

/* ── Firebase config ───────────────────────────── */
const firebaseConfig = {
    apiKey:            'AIzaSyCOT0XBp61Ubj01Os-47OYAAkkbTfJZ6xI',
    authDomain:        'dsc-studio-40d03.firebaseapp.com',
    projectId:         'dsc-studio-40d03',
    storageBucket:     'dsc-studio-40d03.firebasestorage.app',
    messagingSenderId: '1015858327785',
    appId:             '1:1015858327785:web:c4af0e28bce4dd05a5c078',
};

/* Reutiliza o app padrão se já inicializado (módulos ES compartilham o mesmo escopo) */
const fbApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const fbDb  = getFirestore(fbApp);

/* ── Cache em memória ────────────────────────────── */
let PROJECTS_DATA = {};   /* id → objeto normalizado */
let projectsLoaded = false;

/* ── Normaliza documento Firestore → formato interno ─ */
function normalizeProject(id, data) {
    return {
        id:       id,
        title:    data.titulo     || 'Sem título',
        category: data.categoria  || 'Geral',
        desc:     data.descricao  || '',
        client:   data.cliente    || '—',
        local:    data.local      || '',
        software: data.software   || '—',
        ano:      data.ano        || '',
        image:    data.imagemCapa || 'assets/images/placeholder.jpg',
        galeria:  data.galeria    || [],
        has360:   !!data.imagem360,
        imagem360: data.imagem360 || '',
        destaque: !!data.destaque,
        mostrar360: data.mostrar360 || false,
    };
}

/* ── Listener em tempo real do Firestore ───────── */
let projectsListener = null;

function setupProjectsListener() {
    if (projectsListener) return; // Já configurado
    
    try {
        const q = query(collection(fbDb, 'projetos'), orderBy('createdAt', 'desc'));
        projectsListener = onSnapshot(q, (snap) => {
            PROJECTS_DATA = {};
            snap.docs.forEach((d) => {
                const normalized = normalizeProject(d.id, d.data());
                PROJECTS_DATA[d.id] = normalized;
            });
            projectsLoaded = true;
            
            // Renderiza novamente quando houver mudanças
            setTimeout(() => {
                if (typeof PortfolioGrid !== 'undefined') {
                    PortfolioGrid.render();
                }
            }, 100);
        }, (err) => {
            console.error('[portfolio] Erro listener Firestore:', err.code, err.message);
            PROJECTS_DATA = STATIC_FALLBACK;
        });
    } catch (err) {
        console.error('[portfolio] Erro ao configurar listener:', err);
        PROJECTS_DATA = STATIC_FALLBACK;
    }
}

/* ── Busca projetos do Firestore (compatibilidade) ───────────────── */
async function fetchProjects() {
    if (projectsLoaded) return PROJECTS_DATA;
    setupProjectsListener();
    return PROJECTS_DATA;
}

/* ── Dados estáticos de fallback (sem conexão) ── */
const STATIC_FALLBACK = {
    1: { id: 1, title: 'Casa Moderna Alto Padrão',    category: 'Residencial', desc: '', client: '—', software: '3ds Max + Corona', ano: '', image: 'assets/images/projeto-01.jpg', galeria: [], has360: false, imagem360: '', destaque: false, mostrar360: false },
    2: { id: 2, title: 'Living Room Contemporâneo',   category: 'Interiores',  desc: '', client: '—', software: '3ds Max + V-Ray',  ano: '', image: 'assets/images/projeto-02.jpg', galeria: [], has360: true,  imagem360: '', destaque: false, mostrar360: false },
    3: { id: 3, title: 'Fachada Corporativa Premium', category: 'Fachadas',    desc: '', client: '—', software: 'Cinema 4D',        ano: '', image: 'assets/images/projeto-03.jpg', galeria: [], has360: false, imagem360: '', destaque: false, mostrar360: false },
    4: { id: 4, title: 'Escritório Executivo',        category: 'Comercial',   desc: '', client: '—', software: '3ds Max + Corona', ano: '', image: 'assets/images/projeto-04.jpg', galeria: [], has360: true,  imagem360: '', destaque: false, mostrar360: false },
    5: { id: 5, title: 'Penthouse Vista Panorâmica',  category: 'Residencial', desc: '', client: '—', software: '3ds Max + V-Ray',  ano: '', image: 'assets/images/projeto-05.jpg', galeria: [], has360: false, imagem360: '', destaque: false, mostrar360: false },
    6: { id: 6, title: 'Cozinha Gourmet',             category: 'Interiores',  desc: '', client: '—', software: '3ds Max + Corona', ano: '', image: 'assets/images/projeto-06.jpg', galeria: [], has360: true,  imagem360: '', destaque: false, mostrar360: false },
};

/* ================================================
   FILTRO DE PORTFÓLIO
   ================================================ */
const PortfolioFilter = (() => {

    let currentFilter = 'all';
    let listenersAdded = false;

    const getCards    = () => Array.from(document.querySelectorAll('.portfolio-card'));
    const filterBtns  = () => Array.from(document.querySelectorAll('.filter-btn'));

    const filterCards = (filter) => {
        currentFilter = filter;
        getCards().forEach((card) => {
            const category = card.dataset.category;
            const show = filter === 'all' || category === filter;
            if (show) {
                card.classList.remove('is-hiding', 'hidden');
                card.classList.add('is-showing');
                if (filter !== 'all' && card.classList.contains('portfolio-card-large')) {
                    card.style.gridColumn = '';
                }
            } else {
                card.classList.add('is-hiding');
                card.classList.remove('is-showing');
                setTimeout(() => {
                    if (card.classList.contains('is-hiding')) card.classList.add('hidden');
                }, 350);
            }
        });
    };

    const updateActiveBtn = (activeBtn) => {
        filterBtns().forEach((btn) => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-pressed', 'true');
    };

    const init = () => {
        if (listenersAdded) return;
        if (!filterBtns().length) return;
        listenersAdded = true;
        filterBtns().forEach((btn) => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                if (filter === currentFilter) return;
                updateActiveBtn(btn);
                filterCards(filter);
            });
        });
    };

    return { init };
})();


/* ================================================
   MODAL DE PROJETO
   ================================================ */
const ProjectModal = (() => {

    const modal       = document.getElementById('project-modal');
    const closeBtn    = document.getElementById('modal-close');
    const closeBtns   = document.querySelectorAll('.modal-close-btn');
    const imgEl       = document.getElementById('modal-image');
    const categoryEl  = document.getElementById('modal-category');
    const titleEl     = document.getElementById('modal-title');
    const descEl      = document.getElementById('modal-desc');
    const clientEl    = document.getElementById('modal-client');
    const softwareEl  = document.getElementById('modal-software');
    const prazoEl     = document.getElementById('modal-prazo');

    if (!modal) return { init: () => {} };

    let currentProjectId = null;
    let galleryImages    = [];   /* [imagemCapa, ...galeria] do projeto atual */
    let galleryIndex     = 0;

    const counterEl = document.getElementById('modal-counter');
    const prevBtn   = document.getElementById('modal-prev');
    const nextBtn   = document.getElementById('modal-next');

    const showImage = (idx) => {
        galleryIndex = (idx + galleryImages.length) % galleryImages.length;
        imgEl.src = galleryImages[galleryIndex];
        if (counterEl) {
            counterEl.textContent = galleryImages.length > 1
                ? `${galleryIndex + 1} / ${galleryImages.length}`
                : '';
        }
        /* Mostra setas só se houver mais de uma imagem */
        const show = galleryImages.length > 1 ? 'flex' : 'none';
        if (prevBtn) prevBtn.style.display = show;
        if (nextBtn) nextBtn.style.display = show;
    };

    const open = (projectId) => {
        const project = PROJECTS_DATA[projectId];
        if (!project) return;

        currentProjectId = projectId;

        /* Monta galeria: capa + imagens extras */
        galleryImages = [project.image, ...(project.galeria || [])].filter(Boolean);
        showImage(0);

        /* Preenche os dados de texto */
        imgEl.alt              = project.title;
        categoryEl.textContent = project.category;
        titleEl.textContent    = project.title;
        descEl.textContent     = project.desc;
        clientEl.textContent   = project.client;
        softwareEl.textContent = project.software;
        if (prazoEl) prazoEl.textContent = project.local || project.ano || '—';

        /* Abre o modal */
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
    };

    const close = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        currentProjectId = null;
    };

    const navigateGallery = (direction) => {
        if (!galleryImages.length) return;
        showImage(direction === 'next' ? galleryIndex + 1 : galleryIndex - 1);
    };

    const init = () => {
        /* Abre modal ao clicar nos botões dos cards */
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.pcard-btn');
            if (btn) open(btn.dataset.project);
        });

        /* Fecha ao clicar no X */
        closeBtn?.addEventListener('click', close);

        /* Fecha ao clicar nos botões internos que têm modal-close-btn */
        closeBtns.forEach((btn) => btn.addEventListener('click', close));

        /* Setas — navega dentro da galeria do projeto */
        prevBtn?.addEventListener('click', () => navigateGallery('prev'));
        nextBtn?.addEventListener('click', () => navigateGallery('next'));

        /* Teclado */
        document.addEventListener('keydown', (e) => {
            if (!modal.classList.contains('is-open')) return;
            if (e.key === 'Escape')      close();
            if (e.key === 'ArrowRight')  navigateGallery('next');
            if (e.key === 'ArrowLeft')   navigateGallery('prev');
        });
    };

    return { init, open, close };
})();


/* ================================================
   SLIDER DE DEPOIMENTOS
   ================================================ */
const TestimonialsSlider = (() => {

    const track     = document.getElementById('testimonials-track');
    const prevBtn   = document.getElementById('slider-prev');
    const nextBtn   = document.getElementById('slider-next');
    const dots      = document.querySelectorAll('.slider-dot');
    const slides    = document.querySelectorAll('.testimonial-slide');

    if (!track || !slides.length) return { init: () => {} };

    let currentIndex = 0;
    let autoPlayInterval = null;
    const AUTOPLAY_DELAY = 5000;

    const goTo = (index) => {
        /* Normaliza índice */
        currentIndex = (index + slides.length) % slides.length;

        /* Move o track */
        track.style.transform = `translateX(-${currentIndex * 100}%)`;

        /* Atualiza dots */
        dots.forEach((dot, i) => {
            const isActive = i === currentIndex;
            dot.classList.toggle('active', isActive);
            dot.setAttribute('aria-selected', String(isActive));
        });
    };

    const next = () => goTo(currentIndex + 1);
    const prev = () => goTo(currentIndex - 1);

    const startAutoPlay = () => {
        autoPlayInterval = setInterval(next, AUTOPLAY_DELAY);
    };

    const stopAutoPlay = () => {
        clearInterval(autoPlayInterval);
    };

    /* Swipe/Drag suporte */
    let startX = 0;
    let isDragging = false;

    const onDragStart = (e) => {
        startX    = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        isDragging = true;
        stopAutoPlay();
    };

    const onDragEnd = (e) => {
        if (!isDragging) return;
        const endX = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
        const delta = endX - startX;

        if (Math.abs(delta) > 50) {
            delta < 0 ? next() : prev();
        }

        isDragging = false;
        startAutoPlay();
    };

    const init = () => {
        prevBtn?.addEventListener('click', () => { prev(); stopAutoPlay(); startAutoPlay(); });
        nextBtn?.addEventListener('click', () => { next(); stopAutoPlay(); startAutoPlay(); });

        dots.forEach((dot) => {
            dot.addEventListener('click', () => {
                goTo(parseInt(dot.dataset.index, 10));
                stopAutoPlay();
                startAutoPlay();
            });
        });

        /* Swipe em mobile */
        track.addEventListener('touchstart', onDragStart, { passive: true });
        track.addEventListener('touchend',   onDragEnd,   { passive: true });

        /* Pause ao hover */
        track.addEventListener('mouseenter', stopAutoPlay);
        track.addEventListener('mouseleave', startAutoPlay);

        /* Inicia autoplay */
        startAutoPlay();

        /* Keyboard */
        document.addEventListener('keydown', (e) => {
            const sliderSection = document.getElementById('depoimentos');
            if (!sliderSection) return;
            const rect = sliderSection.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                if (e.key === 'ArrowRight') next();
                if (e.key === 'ArrowLeft')  prev();
            }
        });
    };

    return { init, goTo, next, prev };
})();


/* ================================================
   RENDERIZAÇÃO DINÂMICA DO GRID
   ================================================ */
const PortfolioGrid = (() => {

    const grid = document.getElementById('portfolio-grid');

    function buildCard(project) {
        const article = document.createElement('article');
        article.className = 'portfolio-card' + (project.destaque ? ' portfolio-card-large' : '');
        article.dataset.category = project.category.toLowerCase();

        const imgSrc = project.image || 'assets/images/projeto-01.jpg';
        const w = project.destaque ? '800' : '600';
        const h = project.destaque ? '500' : '400';

        article.innerHTML =
            '<div class="pcard-image-wrapper">' +
                '<img src="' + imgSrc + '" alt="' + project.title + '" class="pcard-image" loading="lazy" width="' + w + '" height="' + h + '">' +
                '<div class="pcard-overlay">' +
                    '<div class="pcard-overlay-content">' +
                        '<span class="pcard-cat">' + project.category + '</span>' +
                        '<h3 class="pcard-title">' + project.title + '</h3>' +
                        '<button class="pcard-btn" data-project="' + project.id + '">Ver Projeto ' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                (project.has360 ? '<span class="pcard-360-badge">360°</span>' : '') +
            '</div>' +
            '<div class="pcard-info">' +
                '<span class="pcard-cat-tag">' + project.category + '</span>' +
                '<h3 class="pcard-name">' + project.title + '</h3>' +
            '</div>';

        return article;
    }

    async function render() {
        if (!grid) return;

        const data = await fetchProjects();
        const projects = Object.values(data);

        /* Sem projetos no Firestore — mantém os cards estáticos do HTML */
        if (!projects.length) return;

        /* Remove atributo de reveal para não piscar ao repopular */
        grid.removeAttribute('data-reveal');
        grid.classList.add('is-visible');

        /* Substitui os cards estáticos pelos dinâmicos do Firestore */
        /* Home: apenas projetos com destaque=true aparecem em "Projetos que inspiram" */
        /* Projetos com mostrar360=true aparecem na seção Tour 360° (panorama.js) */
        grid.innerHTML = '';
        const filteredProjects = projects.filter((p) => !!p.destaque);
        filteredProjects.forEach((p) => grid.appendChild(buildCard(p)));

        /* Reinicializa filtros com os novos cards */
        PortfolioFilter.init();
    }

    return { render };
})();


/* ================================================
   INICIALIZAÇÃO DO MÓDULO
   ================================================ */
const PortfolioModule = {
    init() {
        TestimonialsSlider.init();
        ProjectModal.init();
        PortfolioFilter.init();

        /* Carrega projetos do Firestore e substitui os estáticos */
        PortfolioGrid.render().catch((err) => {
            console.warn('[portfolio] render falhou, mantendo cards estáticos.', err);
        });
    }
};

export default PortfolioModule;
