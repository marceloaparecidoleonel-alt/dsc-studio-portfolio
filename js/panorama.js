/**
 * panorama.js
 * Deivid Santos — Visualização Arquitetônica
 *
 * Módulo responsável por:
 * - Gerenciar o visualizador de Tour Virtual 360°
 * - Estrutura preparada para integração com Pannellum
 * - Interação com os cards de tour
 *
 * TODO (Pannellum Integration):
 *
 * 1. Adicionar o script e CSS do Pannellum no <head>:
 *    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css">
 *    <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
 *
 * 2. Substituir a função initViewer() abaixo por:
 *
 *    pannellum.viewer('panorama-viewer', {
 *        type: 'equirectangular',
 *        panorama: scenePath,
 *        autoLoad: true,
 *        autoRotate: -2,
 *        compass: false,
 *        showZoomCtrl: true,
 *        showFullscreenCtrl: true,
 *        hfov: 110,
 *        minHfov: 60,
 *        maxHfov: 130,
 *        pitch: 0,
 *        yaw: 0,
 *    });
 *
 * 3. Adicionar as imagens equiretangulares em assets/images/panoramas/
 */

'use strict';

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy, onSnapshot }
    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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

/* ── Listener em tempo real do Firestore ───────── */
let toursListener = null;
let toursData = [];

function setupToursListener() {
    if (toursListener) return; // Já configurado
    
    try {
        const q = query(collection(fbDb, 'projetos'), orderBy('createdAt', 'desc'));
        toursListener = onSnapshot(q, (snap) => {
            toursData = [];
            snap.docs.forEach((d) => {
                const data = d.data();
                if (data.mostrar360 === true) {
                    /* Compatibilidade: verifica se tem panoramas360 (novo) ou imagem360 (antigo) */
                    let panoramas = [];
                    if (Array.isArray(data.panoramas360) && data.panoramas360.length > 0) {
                        panoramas = data.panoramas360;
                    } else if (data.imagem360) {
                        /* Converte formato antigo para novo */
                        panoramas = [{
                            id: 'pano_legacy',
                            nome: 'Panorama 1',
                            url: data.imagem360
                        }];
                    }

                    if (panoramas.length > 0) {
                        toursData.push({
                            id:        d.id,
                            label:     data.titulo    || 'Sem título',
                            desc:      data.descricao || '',
                            /* Card deve usar o primeiro panorama, não a capa */
                            image:     panoramas[0].url,
                            panoramas: panoramas,
                            /* Para compatibilidade, mantém o primeiro panorama */
                            panorama:  panoramas[0].url,
                        });
                    }
                }
            });

            // Renderiza novamente quando houver mudanças
            if (typeof Tour360Grid !== 'undefined') {
                Tour360Grid.render();
            }
        }, (err) => {
            console.error('[panorama] Erro listener Firestore:', err.message);
        });
    } catch (err) {
        console.error('[panorama] Erro ao configurar listener:', err);
    }
}

/* ── Busca tours do Firestore (compatibilidade) ───────────────── */
async function fetchTours() {
    if (toursData.length > 0) return toursData;
    setupToursListener();
    return toursData;
}

const Tour360Grid = (() => {
    const grid = document.querySelector('.tour-cards-grid');
    
    async function render() {
        if (!grid) return;
        
        const tours = await fetchTours();
        
        // Sempre limpa o grid antes de renderizar
        grid.innerHTML = '';
        
        if (tours.length === 0) return;
        
        renderTourCards(tours);
    }
    
    return { render };
})();

/* ================================================
   DADOS DAS CENAS 360°
   (Substituir pelos paths reais das imagens panorâmicas)
   ================================================ */
const TOUR_SCENES = {
    sala: {
        label:    'Sala de Estar',
        image:    'assets/images/tour-sala.jpg',
        panorama: 'assets/images/panoramas/pano-sala.jpg',
        pitch:    0,
        yaw:      0,
    },
    quarto: {
        label:    'Suíte Master',
        image:    'assets/images/tour-quarto.jpg',
        panorama: 'assets/images/panoramas/pano-quarto.jpg',
        pitch:    0,
        yaw:      0,
    },
    cozinha: {
        label:    'Cozinha Gourmet',
        image:    'assets/images/tour-cozinha.jpg',
        panorama: 'assets/images/panoramas/pano-cozinha.jpg',
        pitch:    0,
        yaw:      0,
    },
};

/* ================================================
   GERENCIADOR DO VIEWER 360°
   ================================================ */
const PanoramaViewer = (() => {

    const viewerEl     = document.getElementById('panorama-viewer');
    const tourCards    = document.querySelectorAll('.tour-card');
    const exploreBtns  = document.querySelectorAll('.tour-explore-btn');

    if (!viewerEl) return { init: () => {} };

    let activeScene   = null;
    let viewerInstance = null; /* Referência para Pannellum quando integrado */
    let currentPanoramas = []; /* Array de panoramas do projeto atual */
    let currentPanoramaIndex = 0; /* Índice do panorama atual */

    /**
     * Cria o placeholder visual simulando o viewer
     * (substituir por pannellum.viewer() na integração real)
     */
    const renderPlaceholder = (scene) => {
        const { label, image } = scene;

        /* Cria preview com a imagem do ambiente selecionado */
        viewerEl.innerHTML = `
            <div class="panorama-active" style="position:relative;width:100%;height:100%;">
                <img
                    src="${image}"
                    alt="Preview 360° — ${label}"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        display:block;
                        filter:brightness(0.7);
                    "
                    loading="lazy"
                >
                <div style="
                    position:absolute;
                    inset:0;
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    justify-content:center;
                    gap:1rem;
                    background:rgba(9,9,9,0.5);
                ">
                    <div style="
                        width:80px;height:80px;
                        border:2px solid rgba(212,161,90,0.6);
                        border-radius:50%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        animation: panoramaSpin 20s linear infinite;
                    ">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D4A15A" stroke-width="1">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                        </svg>
                    </div>
                    <p style="
                        font-family:'Playfair Display',serif;
                        font-size:1.5rem;
                        color:#fff;
                        text-align:center;
                    ">${label}</p>
                    <p style="
                        font-size:0.75rem;
                        color:#D4A15A;
                        letter-spacing:0.2em;
                        text-transform:uppercase;
                        font-family:'Inter',sans-serif;
                    ">Panorama Virtual 360° — Pannellum (integração futura)</p>
                    <p style="
                        font-size:0.7rem;
                        color:rgba(199,199,199,0.6);
                        font-family:'Inter',sans-serif;
                        text-align:center;
                        max-width:360px;
                        line-height:1.6;
                    ">Adicione a imagem equiretangular em<br><code style="color:#D4A15A;">assets/images/panoramas/</code><br>e ative o Pannellum conforme comentários em panorama.js</p>
                </div>
            </div>
        `;

        /* TODO: Substituir o bloco acima por pannellum.viewer() */
    };

    /**
     * Carrega uma URL externa (ex: Cloudinary) diretamente no viewer.
     * Usa Pannellum se disponível, senão usa placeholder.
     * @param {string|Array} urlOrPanoramas  — URL da imagem ou array de panoramas
     * @param {string} [label]    — nome do ambiente
     */
    const loadUrl = (urlOrPanoramas, label) => {
        console.log('[panorama] loadUrl chamado:', urlOrPanoramas, label);

        /* Normaliza para array de panoramas */
        if (typeof urlOrPanoramas === 'string') {
            currentPanoramas = [{ id: 'pano_single', nome: 'Panorama 1', url: urlOrPanoramas }];
        } else if (Array.isArray(urlOrPanoramas) && urlOrPanoramas.length > 0) {
            currentPanoramas = urlOrPanoramas;
        } else {
            console.warn('[panorama] URL ou panoramas vazios, abortando.');
            return;
        }

        currentPanoramaIndex = 0;
        renderPanorama(currentPanoramaIndex, label);
    };

    /**
     * Renderiza um panorama específico com seletor se houver múltiplos
     */
    const renderPanorama = (index, label) => {
        const panorama = currentPanoramas[index];
        if (!panorama || !panorama.url) {
            console.warn('[panorama] Panorama inválido no índice:', index);
            return;
        }

        /* Rola até o viewer */
        viewerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

        /* Destrói viewer anterior e limpa container */
        try {
            if (viewerInstance && typeof viewerInstance.destroy === 'function') viewerInstance.destroy();
        } catch (_) {}
        viewerInstance = null;
        viewerEl.innerHTML = '';

        /* Cria container principal */
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = 'position:relative;width:100%;height:100%;';
        viewerEl.appendChild(mainContainer);

        /* Container do viewer */
        const viewerContainer = document.createElement('div');
        viewerContainer.id = 'pnlm-container';
        viewerContainer.style.cssText = 'width:100%;height:100%;';
        mainContainer.appendChild(viewerContainer);

        /* Usa Pannellum se disponível */
        if (typeof pannellum !== 'undefined') {
            viewerInstance = pannellum.viewer('pnlm-container', {
                type:              'equirectangular',
                panorama:          panorama.url,
                autoLoad:          true,
                autoRotate:        -2,
                compass:           false,
                showZoomCtrl:      true,
                showFullscreenCtrl: true,
                hfov:              110,
                minHfov:           60,
                maxHfov:           130,
                pitch:             0,
                yaw:               0,
                title:             panorama.nome || label || '',
            });
        } else {
            /* Fallback: placeholder simples */
            viewerContainer.innerHTML =
                '<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--clr-bg);padding:20px;">' +
                    '<img src="' + panorama.url + '" alt="' + (panorama.nome || label || 'Panorama 360°') + '" style="max-width:100%;max-height:400px;object-fit:contain;border-radius:8px;">' +
                    '<p style="margin-top:16px;color:#fff;font-size:13px;">Pannellum não carregado.</p>' +
                '</div>';
        }

        /* Adiciona seletor se houver múltiplos panoramas */
        if (currentPanoramas.length > 1) {
            renderPanoramaSelector(mainContainer, label);
        }
    };

    /**
     * Renderiza seletor de panoramas (bolinhas)
     */
    const renderPanoramaSelector = (container, label) => {
        const selector = document.createElement('div');
        selector.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;padding:8px 16px;background:rgba(0,0,0,0.6);border-radius:20px;z-index:10;';

        currentPanoramas.forEach((pano, idx) => {
            const dot = document.createElement('button');
            dot.style.cssText = 'width:12px;height:12px;border-radius:50%;border:2px solid rgba(255,255,255,0.5);background:' + (idx === currentPanoramaIndex ? '#fff' : 'transparent') + ';cursor:pointer;transition:all 0.2s;';
            dot.setAttribute('aria-label', pano.nome || 'Panorama ' + (idx + 1));
            dot.addEventListener('click', () => {
                currentPanoramaIndex = idx;
                renderPanorama(idx, label);
            });
            selector.appendChild(dot);
        });

        container.appendChild(selector);
    };

    /**
     * Ativa uma cena do tour (cards estáticos da seção Tour)
     */
    const loadScene = (tourKey) => {
        const scene = TOUR_SCENES[tourKey];
        if (!scene || activeScene === tourKey) return;

        activeScene = tourKey;
        loadUrl(scene.panorama, scene.label);

        /* Atualiza estado visual dos cards */
        tourCards.forEach((card) => {
            const isActive = card.dataset.tour === tourKey;
            card.style.borderColor = isActive ? 'rgba(212, 161, 90, 0.5)' : '';
            card.style.boxShadow   = isActive ? '0 0 30px rgba(212, 161, 90, 0.15)' : '';
        });
    };

    const init = () => {
        /* Botões "Explorar Ambiente" — cards estáticos (fallback) */
        exploreBtns.forEach((btn) => {
            btn.addEventListener('click', () => loadScene(btn.dataset.tour));
        });
        tourCards.forEach((card) => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.tour-explore-btn')) return;
                loadScene(card.dataset.tour);
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadScene(card.dataset.tour); }
            });
        });

        /* Carrega tours do Firestore e substitui cards estáticos */
        fetchTours().then((tours) => {
            if (tours.length) renderTourCards(tours);
        });
    };

    return { init, loadScene, loadUrl };
})();

/* ── Renderiza cards de tours 360° ───────────────────── */
const renderTourCards = (tours) => {
    const grid = document.querySelector('.tour-cards-grid');
    if (!grid || !tours.length) return;

    grid.innerHTML = '';
    tours.forEach((tour) => {
        const card = document.createElement('div');
        card.className = 'tour-card';
        card.setAttribute('tabindex', '0');
        card.innerHTML =
            '<div class="tour-card-image-wrapper">' +
                '<img src="' + tour.image + '" alt="Panorama 360° - ' + tour.label + '" class="tour-card-image" loading="lazy" width="400" height="260">' +
                '<div class="tour-card-badge" aria-hidden="true">' +
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
                    '<span>360°</span>' +
                '</div>' +
            '</div>' +
            '<div class="tour-card-content">' +
                '<h3 class="tour-card-title">' + tour.label + '</h3>' +
                (tour.desc ? '<p class="tour-card-desc">' + tour.desc + '</p>' : '') +
                '<button class="btn btn-outline btn-sm tour-explore-btn">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
                    'Explorar Ambiente' +
                '</button>' +
            '</div>';

        const exploreBtn = card.querySelector('.tour-explore-btn');
        exploreBtn.addEventListener('click', (e) => { e.stopPropagation(); PanoramaViewer.loadUrl(tour.panoramas || tour.panorama, tour.label); });
        card.addEventListener('click', () => PanoramaViewer.loadUrl(tour.panoramas || tour.panorama, tour.label));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); PanoramaViewer.loadUrl(tour.panoramas || tour.panorama, tour.label); }
        });

        grid.appendChild(card);
    });
};


/* ================================================
   INICIALIZAÇÃO DO MÓDULO
   ================================================ */
const PanoramaModule = {
    init() {
        PanoramaViewer.init();
    },
    loadUrl(url, label) {
        PanoramaViewer.loadUrl(url, label);
    }
};

export default PanoramaModule;
