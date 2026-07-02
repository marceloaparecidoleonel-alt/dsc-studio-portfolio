/**
 * config.js
 * DSC Studio — Carrega configurações do estúdio do Firestore em tempo real
 */

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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

/* ── Elementos do DOM ───────────────────────────── */
const elements = {
    heroSubtitle: document.querySelector('.hero-subtitle'),
    whatsappLinks: document.querySelectorAll('a[href^="https://wa.me"]'),
    emailLinks: document.querySelectorAll('a[href^="mailto:"]'),
    emailTexts: document.querySelectorAll('.contact-info-value[href^="mailto:"], .footer-contact-item a[href^="mailto:"]'),
    instagramLinks: document.querySelectorAll('a[href*="instagram.com"]'),
    instagramTexts: document.querySelectorAll('.footer-contact-item a[href*="instagram.com"]'),
    footerLogo: document.querySelector('.footer-logo .logo-tagline'),
    footerDesc: document.querySelector('.footer-desc'),
};

/* ── Atualiza elementos com as configurações ─────── */
function updateElements(config) {
    if (!config) return;

    // Descrição do hero
    if (elements.heroSubtitle && config.heroDesc) {
        elements.heroSubtitle.textContent = config.heroDesc;
    }

    // WhatsApp
    if (config.whatsapp) {
        elements.whatsappLinks.forEach(function(link) {
            var phone = config.whatsapp.replace(/\D/g, '');
            link.href = 'https://wa.me/55' + phone;
        });
    }

    // E-mail
    if (config.email) {
        elements.emailLinks.forEach(function(link) {
            link.href = 'mailto:' + config.email;
        });
        elements.emailTexts.forEach(function(link) {
            link.href = 'mailto:' + config.email;
            link.textContent = config.email;
        });
    }

    // Instagram
    if (config.instagram) {
        elements.instagramLinks.forEach(function(link) {
            var username = config.instagram.replace('@', '');
            link.href = 'https://instagram.com/' + username;
        });
        elements.instagramTexts.forEach(function(link) {
            var username = config.instagram.replace('@', '');
            link.href = 'https://instagram.com/' + username;
            link.textContent = config.instagram;
        });
    }

    // Logo tagline (Visualização Arquitetônica)
    if (elements.footerLogo && config.specialty) {
        elements.footerLogo.textContent = config.specialty;
    }

    // Descrição do footer
    if (elements.footerDesc && config.studioName) {
        elements.footerDesc.textContent = config.studioName + ' — ' + (config.specialty || 'Visualização Arquitetônica');
    }
}

/* ── Listener em tempo real do Firestore ─────────── */
function initConfigListener() {
    var configRef = doc(fbDb, 'projetos', 'studio_config');
    
    onSnapshot(configRef, function(doc) {
        if (doc.exists()) {
            var config = doc.data();
            console.log('[config] Configurações atualizadas:', config);
            updateElements(config);
        } else {
            console.log('[config] Nenhuma configuração encontrada, usando valores padrão');
        }
    }, function(error) {
        console.error('[config] Erro ao ouvir configurações:', error);
    });
}

/* ── Inicializa ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
    initConfigListener();
});
