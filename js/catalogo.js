/**
 * catalogo.js
 * Deivid Santos — Visualização Arquitetônica
 *
 * Módulo do catálogo completo de projetos.
 * Carrega todos os projetos do Firestore (sem filtro de destaque).
 */

'use strict';

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy, onSnapshot }
    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ── Loading Screen ───────────────────────────── */
const LoadingScreen = (() => {
    const screen = document.getElementById('loading-screen');
    const LOADING_DURATION = 1800;

    const hide = () => {
        screen?.classList.add('hidden');
        document.body.style.overflow = '';
    };

    const init = () => {
        if (!screen) return;
        document.body.style.overflow = 'hidden';
        const minTime = new Promise((resolve) => setTimeout(resolve, LOADING_DURATION));
        const pageReady = new Promise((resolve) => {
            if (document.readyState === 'complete') resolve();
            else window.addEventListener('load', resolve, { once: true });
        });
        Promise.all([minTime, pageReady]).then(hide).catch(() => hide());
        /* Fallback: esconde após 5 segundos mesmo se falhar */
        setTimeout(hide, 5000);
    };

    return { init };
})();

/* ── Cursor Personalizado ───────────────────────── */
const Cursor = (() => {
    const cursor = document.getElementById('custom-cursor');
    const core = cursor?.querySelector('.cursor-core');
    const trail = cursor?.querySelector('.cursor-trail');
    const label = cursor?.querySelector('.cursor-label');

    if (!cursor || !matchMedia('(pointer: fine)').matches) return { init: () => {} };

    let mouseX = 0, mouseY = 0;
    let trailX = 0, trailY = 0;

    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
        core.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
        label.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
        trailX = lerp(trailX, mouseX, 0.1);
        trailY = lerp(trailY, mouseY, 0.1);
        trail.style.transform = `translate(${trailX}px, ${trailY}px) translate(-50%, -50%)`;
        requestAnimationFrame(tick);
    };

    const hoverSelectors = 'a, button, [role="button"], .filter-btn, .pcard-btn, .portfolio-card, input, textarea, select';

    const setLabel = (el) => {
        if (!el) return;
        if (el.matches('.pcard-btn, .portfolio-card')) label.textContent = 'VER';
        else if (el.matches('a[href^="https://wa.me"]')) label.textContent = 'WA';
        else if (el.matches('input, textarea, select')) label.textContent = '';
        else label.textContent = '';
    };

    const init = () => {
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest(hoverSelectors);
            if (target) {
                cursor.classList.add('cursor-hover');
                setLabel(target);
            } else {
                cursor.classList.remove('cursor-hover');
                label.textContent = '';
            }
        });

        tick();
    };

    return { init };
})();

/* ── Firebase config ───────────────────────────── */
const firebaseConfig = {
    apiKey:            'AIzaSyCOT0XBp61Ubj01Os-47OYAAkkbTfJZ6xI',
    authDomain:        'dsc-studio-40d03.firebaseapp.com',
    projectId:         'dsc-studio-40d03',
    storageBucket:     'dsc-studio-40d03.firebasestorage.app',
    messagingSenderId: '1015858327785',
    appId:             '1:1015858327785:web:c4af0e28bce4dd05a5c078',
};

const fbApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const fbDb  = getFirestore(fbApp);

/* ── Cache em memória ────────────────────────────── */
let PROJECTS_DATA = {};
let projectsLoaded = false;

/* ── Normaliza documento Firestore ───────────────── */
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
        /* Compatibilidade: verifica panoramas360 ou imagem360 */
        has360:   !!(Array.isArray(data.panoramas360) ? data.panoramas360.length > 0 : data.imagem360),
        imagem360: Array.isArray(data.panoramas360) && data.panoramas360.length > 0 ? data.panoramas360[0].url : (data.imagem360 || ''),
        panoramas360: data.panoramas360 || [],
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
                PROJECTS_DATA[d.id] = normalizeProject(d.id, d.data());
            });
            projectsLoaded = true;
            console.log('[catalogo] Projetos atualizados:', snap.size);
            
            // Renderiza novamente quando houver mudanças
            if (typeof CatalogGrid !== 'undefined') {
                CatalogGrid.render();
            }
        }, (err) => {
            console.error('[catalogo] Erro listener Firestore:', err.message);
        });
    } catch (err) {
        console.error('[catalogo] Erro ao configurar listener:', err);
    }
}

/* ── Busca projetos do Firestore (compatibilidade) ───────────────── */
async function fetchProjects() {
    if (projectsLoaded) return PROJECTS_DATA;
    setupProjectsListener();
    return PROJECTS_DATA;
}

/* ── Filtro de categorias ───────────────────────── */
const CatalogFilter = (() => {
    let currentFilter = 'all';

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
        filterBtns().forEach((btn) => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                if (filter === currentFilter) return;
                updateActiveBtn(btn);
                filterCards(filter);
            });
        });
    };

    return { init, filterCards };
})();

/* ── Modal de projeto com galeria de imagens ───────── */
const ProjectModal = (() => {
    const modal      = document.getElementById('project-modal');
    const imgEl      = document.getElementById('modal-image');
    const titleEl    = document.getElementById('modal-title');
    const descEl     = document.getElementById('modal-desc');
    const catEl      = document.getElementById('modal-category');
    const prevBtn    = document.getElementById('modal-prev');
    const nextBtn    = document.getElementById('modal-next');
    const counterEl  = document.getElementById('modal-counter');
    const closeBtn   = document.getElementById('modal-close');

    let currentProjectId = null;
    let galleryImages = [];
    let galleryIndex = 0;
    let is360View = false;
    let viewerInstance = null;

    const showImage = (idx) => {
        if (idx < 0 || idx >= galleryImages.length) return;
        galleryIndex = idx;
        const imgUrl = galleryImages[idx];

        /* Verifica se é panorama 360° (prefixo especial) */
        if (typeof imgUrl === 'string' && imgUrl.startsWith('360__')) {
            const panoramaUrl = imgUrl.replace('360__', '');
            show360(panoramaUrl);
            if (counterEl) counterEl.textContent = '360°';
            if (prevBtn) prevBtn.style.visibility = 'visible';
            if (nextBtn) nextBtn.style.visibility = 'hidden';
            return;
        }

        /* Imagem estática normal */
        is360View = false;
        const container = document.getElementById('panorama-container');
        if (container) container.style.display = 'none';
        if (imgEl) {
            imgEl.style.display = 'block';
            imgEl.src = imgUrl;
        }
        /* Destroi viewer 360° se existir */
        if (viewerInstance && typeof viewerInstance.destroy === 'function') {
            viewerInstance.destroy();
            viewerInstance = null;
        }
        if (counterEl) counterEl.textContent = `${idx + 1} / ${galleryImages.length}`;
        if (prevBtn) prevBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
        if (nextBtn) nextBtn.style.visibility = idx === galleryImages.length - 1 ? 'hidden' : 'visible';
    };

    const show360 = (url) => {
        if (!url) return;
        is360View = true;
        const container = document.getElementById('panorama-container');
        if (imgEl) imgEl.style.display = 'none';
        if (container) container.style.display = 'block';
        /* Destroi viewer anterior se existir */
        if (viewerInstance && typeof viewerInstance.destroy === 'function') {
            viewerInstance.destroy();
            viewerInstance = null;
        }
        /* Cria novo viewer Pannellum no container específico */
        if (typeof pannellum !== 'undefined' && container) {
            viewerInstance = pannellum.viewer('panorama-container', {
                type: 'equirectangular',
                panorama: url,
                autoLoad: true,
                autoRotate: -2,
                showZoomCtrl: true,
                showFullscreenCtrl: true,
                hfov: 110,
                minHfov: 60,
                maxHfov: 130,
            });
        }
        if (counterEl) counterEl.textContent = '360°';
        if (prevBtn) prevBtn.style.visibility = 'hidden';
        if (nextBtn) nextBtn.style.visibility = 'hidden';
    };

    const open = (projectId) => {
        const project = PROJECTS_DATA[projectId];
        if (!project) {
            console.error('[ProjectModal] Projeto não encontrado:', projectId);
            return;
        }
        galleryImages = [project.image, ...(project.galeria || [])].filter(Boolean);
        /* Adiciona panorama 360° no final se existir */
        if (project.has360 && project.imagem360) {
            galleryImages.push('360__' + project.imagem360);
        }
        if (galleryImages.length === 0) {
            console.error('[ProjectModal] Nenhuma imagem no projeto');
            return;
        }
        if (titleEl) titleEl.textContent = project.title;
        if (descEl) descEl.textContent = project.desc;
        if (catEl) catEl.textContent = project.category;
        currentProjectId = projectId;

        if (modal) {
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
        }
        document.body.style.overflow = 'hidden';

        /* Abre sempre na primeira imagem da galeria */
        showImage(0);
    };

    const close = () => {
        if (modal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }
        document.body.style.overflow = '';
        currentProjectId = null;
        is360View = false;
        /* Destroi viewer 360° se existir */
        if (viewerInstance && typeof viewerInstance.destroy === 'function') {
            viewerInstance.destroy();
            viewerInstance = null;
        }
    };

    const navigateGallery = (direction) => {
        if (is360View) return; /* Não navega galeria quando em modo 360° */
        showImage(direction === 'next' ? galleryIndex + 1 : galleryIndex - 1);
    };

    const init = () => {
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
        if (prevBtn) prevBtn.addEventListener('click', () => navigateGallery('prev'));
        if (nextBtn) nextBtn.addEventListener('click', () => navigateGallery('next'));
    };

    return { init, open };
})();

/* ── Renderização do grid do catálogo ───────────────── */
const CatalogGrid = (() => {
    const grid = document.getElementById('catalogo-grid');

    function buildCard(project) {
        const article = document.createElement('article');
        article.className = 'portfolio-card';
        article.dataset.category = project.category.toLowerCase();

        const imgSrc = project.image || 'assets/images/projeto-01.jpg';

        article.innerHTML =
            '<div class="pcard-image-wrapper">' +
                '<img src="' + imgSrc + '" alt="' + project.title + '" class="pcard-image" loading="lazy" width="600" height="400">' +
                '<div class="pcard-overlay">' +
                    '<div class="pcard-overlay-content">' +
                        '<span class="pcard-cat">' + project.category + '</span>' +
                        '<h3 class="pcard-title">' + project.title + '</h3>' +
                        '<button class="pcard-btn" data-project="' + project.id + '">Ver Projeto ' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
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

        if (!projects.length) {
            console.warn('[catalogo] Nenhum projeto encontrado, mantendo cards estáticos');
            return;
        }

        grid.innerHTML = '';
        /* Catálogo: TODOS os projetos (incluindo 360°) */
        projects.forEach((p) => grid.appendChild(buildCard(p)));

        /* Conecta botões ao modal */
        grid.querySelectorAll('.pcard-btn').forEach((btn) => {
            btn.addEventListener('click', () => ProjectModal.open(btn.dataset.project));
        });

        CatalogFilter.init();
        /* Aplica filtro inicial para mostrar todos os cards */
        CatalogFilter.filterCards('all');
    }

    return { render };
})();

/* ── Inicialização ───────────────────────────────── */
const CatalogModule = {
    init() {
        try {
            LoadingScreen.init();
            Cursor.init();
            ProjectModal.init();
            CatalogGrid.render().catch((err) => {
                console.warn('[catalogo] render falhou, mantendo cards estáticos.', err);
            });
        } catch (err) {
            console.error('[catalogo] Erro na inicialização:', err);
            /* Garante que loading screen esconda mesmo com erro */
            const screen = document.getElementById('loading-screen');
            if (screen) screen.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
};

CatalogModule.init();
