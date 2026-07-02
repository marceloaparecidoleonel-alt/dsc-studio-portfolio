/**
 * app.js
 * Deivid Santos — Visualização Arquitetônica
 *
 * Módulo principal — Orquestra todos os submódulos:
 * - Loading Screen
 * - Navbar (scroll + hamburger)
 * - Active nav links por seção
 * - Back to Top
 * - Formulário de contato com validação
 * - Footer year
 * - Lazy loading images fallback
 * - Smooth scroll nos links internos
 * - Importa e inicializa os outros módulos
 *
 * TODO (Firebase Integration):
 * - import { initializeApp } from 'firebase/app'
 * - import { getFirestore, addDoc, collection } from 'firebase/firestore'
 * - Configurar firebaseConfig com variáveis de ambiente
 */

'use strict';

/* ================================================
   IMPORTAÇÕES DOS MÓDULOS
   (usando ES Modules — o HTML usa <script type="module">
    via app.js, então os outros são importados aqui)
   ================================================ */
import AnimationsModule from './animations.js';
import PortfolioModule  from './portfolio.js';
import PanoramaModule   from './panorama.js';
import ParticlesModule  from './particles.js';


/* ================================================
   LOADING SCREEN
   ================================================ */
const LoadingScreen = (() => {

    const screen = document.getElementById('loading-screen');
    const LOADING_DURATION = 2400; /* ms — tempo mínimo de exibição */

    const hide = () => {
        screen?.classList.add('hidden');
        document.body.style.overflow = '';
    };

    const init = () => {
        if (!screen) return;

        /* Bloqueia scroll durante loading */
        document.body.style.overflow = 'hidden';

        /* Aguarda o tempo mínimo + carregamento da página */
        const minTime   = new Promise((resolve) => setTimeout(resolve, LOADING_DURATION));
        const pageReady = new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve, { once: true });
            }
        });

        Promise.all([minTime, pageReady]).then(hide);
    };

    return { init };
})();


/* ================================================
   NAVBAR
   ================================================ */
const Navbar = (() => {

    const navbar      = document.getElementById('navbar');
    const hamburger   = document.getElementById('nav-hamburger');
    const mobileMenu  = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link, .mobile-cta');

    if (!navbar) return { init: () => {} };

    let isMenuOpen = false;

    /** Adiciona/remove classe .scrolled ao rolar */
    const handleScroll = () => {
        const isScrolled = window.scrollY > 40;
        navbar.classList.toggle('scrolled', isScrolled);
    };

    /** Abre/fecha menu mobile */
    const toggleMenu = (force) => {
        isMenuOpen = typeof force === 'boolean' ? force : !isMenuOpen;

        hamburger.classList.toggle('is-open', isMenuOpen);
        hamburger.setAttribute('aria-expanded', String(isMenuOpen));
        mobileMenu.classList.toggle('is-open', isMenuOpen);
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    };

    const init = () => {
        /* Scroll handler */
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); /* Checa na inicialização */

        /* Hamburger toggle */
        hamburger?.addEventListener('click', () => toggleMenu());

        /* Fecha ao clicar em link do menu mobile */
        mobileLinks.forEach((link) => {
            link.addEventListener('click', () => toggleMenu(false));
        });

        /* Fecha ao pressionar ESC */
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMenuOpen) toggleMenu(false);
        });

        /* Fecha ao clicar fora do menu (overlay) */
        document.addEventListener('click', (e) => {
            if (
                isMenuOpen &&
                !mobileMenu.contains(e.target) &&
                !hamburger.contains(e.target)
            ) {
                toggleMenu(false);
            }
        });
    };

    return { init };
})();


/* ================================================
   ACTIVE NAV LINKS — Destaca o link da seção atual
   ================================================ */
const ActiveNavLinks = (() => {

    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    if (!navLinks.length || !sections.length) return { init: () => {} };

    const OFFSET = 120; /* px de antecipação */

    const update = () => {
        const scrollY = window.scrollY + OFFSET;

        let currentSection = '';
        sections.forEach((section) => {
            if (section.offsetTop <= scrollY) {
                currentSection = section.id;
            }
        });

        navLinks.forEach((link) => {
            const href = link.getAttribute('href')?.replace('#', '');
            link.classList.toggle('active', href === currentSection);
            link.setAttribute('aria-current', href === currentSection ? 'page' : 'false');
        });
    };

    const init = () => {
        window.addEventListener('scroll', update, { passive: true });
        update();
    };

    return { init };
})();


/* ================================================
   SMOOTH SCROLL — Links âncora
   ================================================ */
const SmoothScroll = (() => {

    const NAV_OFFSET = 80; /* Altura da navbar fixa */

    const scrollToSection = (targetId) => {
        const target = document.getElementById(targetId);
        if (!target) return;

        const top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
        window.scrollTo({ top, behavior: 'smooth' });
    };

    const init = () => {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;

            const targetId = link.getAttribute('href').replace('#', '');
            if (!targetId) return;

            e.preventDefault();
            scrollToSection(targetId);
        });
    };

    return { init };
})();


/* ================================================
   BACK TO TOP
   ================================================ */
const BackToTop = (() => {

    const btn = document.getElementById('back-to-top');
    const SHOW_AFTER = 600; /* px */

    if (!btn) return { init: () => {} };

    const init = () => {
        window.addEventListener('scroll', () => {
            btn.classList.toggle('visible', window.scrollY > SHOW_AFTER);
        }, { passive: true });

        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };

    return { init };
})();


/* ================================================
   FORMULÁRIO DE CONTATO — Validação & Submit
   ================================================ */
const ContactForm = (() => {

    const form        = document.getElementById('contato-form');
    const submitBtn   = document.getElementById('form-submit');
    const successMsg  = document.getElementById('form-success');

    if (!form) return { init: () => {} };

    /* Regras de validação */
    const VALIDATORS = {
        nome: {
            validate: (v) => v.trim().length >= 2,
            message: 'Por favor, informe seu nome completo.',
        },
        email: {
            validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
            message: 'Por favor, informe um e-mail válido.',
        },
        tipo: {
            validate: (v) => v !== '',
            message: 'Por favor, selecione o tipo de projeto.',
        },
        mensagem: {
            validate: (v) => v.trim().length >= 10,
            message: 'Por favor, escreva uma mensagem com pelo menos 10 caracteres.',
        },
    };

    const getField = (name) => form.querySelector(`[name="${name}"]`);
    const getError = (name) => getField(name)?.closest('.form-group')?.querySelector('.form-error');

    /** Valida um campo específico */
    const validateField = (name) => {
        const field     = getField(name);
        const errorEl   = getError(name);
        const validator = VALIDATORS[name];

        if (!field || !validator) return true;

        const isValid = validator.validate(field.value);

        field.classList.toggle('error', !isValid);
        if (errorEl) errorEl.textContent = isValid ? '' : validator.message;

        return isValid;
    };

    /** Valida o formulário inteiro */
    const validateAll = () => {
        return Object.keys(VALIDATORS).every((name) => validateField(name));
    };

    /**
     * Envia os dados do formulário
     *
     * TODO (Firebase Integration):
     * Substituir o bloco abaixo pela integração com Firestore:
     *
     * const db = getFirestore(firebaseApp);
     * await addDoc(collection(db, 'leads'), {
     *     nome:      data.get('nome'),
     *     email:     data.get('email'),
     *     telefone:  data.get('telefone'),
     *     tipo:      data.get('tipo'),
     *     mensagem:  data.get('mensagem'),
     *     timestamp: serverTimestamp(),
     * });
     */
    const submitForm = async (data) => {
        /* Simulação de envio — 1.5s delay */
        await new Promise((resolve) => setTimeout(resolve, 1500));

        /* TODO: substituir pela chamada real à API / Firebase */
        console.log('Dados do formulário:', {
            nome:     data.get('nome'),
            email:    data.get('email'),
            telefone: data.get('telefone'),
            tipo:     data.get('tipo'),
            mensagem: data.get('mensagem'),
        });

        /* Sucesso */
        return { success: true };
    };

    const setLoading = (loading) => {
        submitBtn.classList.toggle('is-loading', loading);
        submitBtn.disabled = loading;
    };

    const showSuccess = () => {
        form.style.opacity = '0.5';
        form.style.pointerEvents = 'none';
        successMsg.hidden = false;
        successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        /* Resets após 8 segundos */
        setTimeout(() => {
            form.reset();
            form.style.opacity = '';
            form.style.pointerEvents = '';
            successMsg.hidden = true;
        }, 8000);
    };

    const init = () => {
        /* Validação ao sair do campo (blur) */
        Object.keys(VALIDATORS).forEach((name) => {
            const field = getField(name);
            field?.addEventListener('blur', () => validateField(name));
            field?.addEventListener('input', () => {
                /* Limpa erro ao digitar */
                if (field.classList.contains('error')) {
                    validateField(name);
                }
            });
        });

        /* Submit */
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validateAll()) {
                /* Foca no primeiro campo inválido */
                const firstError = form.querySelector('.form-input.error');
                firstError?.focus();
                return;
            }

            setLoading(true);

            try {
                const data   = new FormData(form);
                const result = await submitForm(data);

                if (result.success) {
                    showSuccess();
                }
            } catch (err) {
                console.error('Erro ao enviar formulário:', err);
                alert('Ocorreu um erro ao enviar sua mensagem. Por favor, tente novamente.');
            } finally {
                setLoading(false);
            }
        });

        /* Máscara de telefone simples */
        const telField = getField('telefone');
        telField?.addEventListener('input', () => {
            let value = telField.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
            }
            telField.value = value;
        });
    };

    return { init };
})();


/* ================================================
   FOOTER — Ano dinâmico
   ================================================ */
const FooterYear = (() => {
    const el = document.getElementById('footer-year');
    const init = () => {
        if (el) el.textContent = new Date().getFullYear();
    };
    return { init };
})();


/* ================================================
   LAZY LOADING — Fallback para imagens sem src
   (Adiciona placeholder visual enquanto não há imagem real)
   ================================================ */
const ImageFallback = (() => {

    const PLACEHOLDER_STYLE = `
        background: linear-gradient(135deg, #181818 0%, #111111 50%, #181818 100%);
        background-size: 200% 200%;
        animation: shimmer 2s ease infinite;
    `;

    const init = () => {
        const images = document.querySelectorAll('img');

        images.forEach((img) => {
            /* Aplica placeholder visual se a imagem não existir */
            img.addEventListener('error', () => {
                img.style.cssText = PLACEHOLDER_STYLE;
                img.alt = img.alt || 'Imagem indisponível';
            });
        });

        /* Injeta keyframe do shimmer se ainda não existir */
        if (!document.getElementById('shimmer-style')) {
            const style = document.createElement('style');
            style.id = 'shimmer-style';
            style.textContent = `
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `;
            document.head.appendChild(style);
        }
    };

    return { init };
})();


/* ================================================
   MENU OVERLAY — Backdrop ao abrir menu mobile
   ================================================ */
const MenuOverlay = (() => {

    const init = () => {
        const overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 998;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.4s ease, visibility 0.4s;
            backdrop-filter: blur(4px);
        `;
        document.body.appendChild(overlay);

        /* Observa mudanças na classe do mobile menu */
        const mobileMenu = document.getElementById('mobile-menu');
        if (!mobileMenu) return;

        const observer = new MutationObserver(() => {
            const isOpen = mobileMenu.classList.contains('is-open');
            overlay.style.opacity    = isOpen ? '1' : '0';
            overlay.style.visibility = isOpen ? 'visible' : 'hidden';
        });

        observer.observe(mobileMenu, { attributes: true, attributeFilter: ['class'] });

        /* Fecha menu ao clicar no overlay */
        overlay.addEventListener('click', () => {
            document.getElementById('nav-hamburger')?.click();
        });
    };

    return { init };
})();


/* ================================================
   INICIALIZAÇÃO PRINCIPAL
   ================================================ */
const App = {

    init() {
        /* Loading primeiro */
        LoadingScreen.init();

        /* Core UI */
        Navbar.init();
        ActiveNavLinks.init();
        SmoothScroll.init();
        BackToTop.init();
        FooterYear.init();
        ImageFallback.init();
        MenuOverlay.init();

        /* Formulário */
        ContactForm.init();

        /* Módulos externos */
        AnimationsModule.init();
        PortfolioModule.init();
        PanoramaModule.init();
        ParticlesModule.init();

        console.log('%cDeivid Santos — Visualização Arquitetônica', 'color:#3B82F6;font-size:14px;font-weight:bold;');
        console.log('%cSite desenvolvido com HTML, CSS e JavaScript Vanilla ES6', 'color:#888;font-size:11px;');
        console.log('%cTODO: Conectar Firebase para backend dinâmico', 'color:#444;font-size:11px;font-style:italic;');
    }

};

/* Garante que o DOM esteja pronto */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
