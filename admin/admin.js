/**
 * DSC Studio — Admin Panel JS
 * Firebase Authentication + Firestore + Cloudinary
 */

'use strict';

/* ── FIREBASE (CDN via importmap no HTML) ────────── */
import { initializeApp }                     from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider, setPersistence, browserSessionPersistence }
    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    getFirestore, collection, doc,
    addDoc, setDoc, getDoc, getDocs,
    deleteDoc, query, orderBy, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ── CONFIG ─────────────────────────────────────── */
const firebaseConfig = {
    apiKey:            'AIzaSyCOT0XBp61Ubj01Os-47OYAAkkbTfJZ6xI',
    authDomain:        'dsc-studio-40d03.firebaseapp.com',
    projectId:         'dsc-studio-40d03',
    storageBucket:     'dsc-studio-40d03.firebasestorage.app',
    messagingSenderId: '1015858327785',
    appId:             '1:1015858327785:web:c4af0e28bce4dd05a5c078',
};

const CLOUD_NAME    = 'dvin8hkmv';
const UPLOAD_PRESET = 'dsc-studio';
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const COLLECTION    = 'projetos';

/* ── FIREBASE INIT ───────────────────────────────── */
const fbApp  = initializeApp(firebaseConfig);
const fbAuth = getAuth(fbApp);
const fbDb   = getFirestore(fbApp);

/* Configura persistência SESSION para painel admin (expira ao fechar navegador) */
setPersistence(fbAuth, browserSessionPersistence).catch(function(err) {
    console.error('Erro ao configurar persistência:', err);
});

/* ══════════════════════════════════════════════════
   CLOUDINARY UPLOAD
   ══════════════════════════════════════════════════ */

/**
 * Comprime uma imagem via Canvas antes do upload.
 * Garante que o arquivo fique abaixo de maxSizeMB.
 * @param {File}   file
 * @param {number} maxSizeMB   — limite em MB (padrão 9)
 * @param {number} maxWidthPx  — largura máxima em px (padrão 8192 para 360°)
 * @returns {Promise<File>}
 */
function compressImage(file, maxSizeMB, maxWidthPx) {
    maxSizeMB  = maxSizeMB  || 9;
    maxWidthPx = maxWidthPx || 8192;
    var maxBytes = maxSizeMB * 1024 * 1024;

    return new Promise(function (resolve) {
        /* Se já está dentro do limite, não comprime */
        if (file.size <= maxBytes) { resolve(file); return; }

        var img = new Image();
        var url = URL.createObjectURL(file);

        img.onload = function () {
            URL.revokeObjectURL(url);

            var w = img.naturalWidth;
            var h = img.naturalHeight;

            /* Reduz dimensões até caber no limite de pixels */
            if (w > maxWidthPx) { h = Math.round(h * maxWidthPx / w); w = maxWidthPx; }

            var canvas = document.createElement('canvas');
            canvas.width  = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);

            /* Tenta qualidade decrescente até ficar abaixo do limite */
            var quality = 0.85;
            var attempt = function () {
                canvas.toBlob(function (blob) {
                    if (!blob) { resolve(file); return; }
                    if (blob.size <= maxBytes || quality <= 0.3) {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    } else {
                        quality -= 0.1;
                        attempt();
                    }
                }, 'image/jpeg', quality);
            };
            attempt();
        };

        img.onerror = function () { resolve(file); }; /* fallback: envia original */
        img.src = url;
    });
}

function uploadToCloudinary(file, onProgress) {
    /* Comprime antes de enviar se necessário */
    return compressImage(file).then(function (compressed) {
        if (compressed !== file) {
            console.log('[Cloudinary] Comprimido: ' +
                (file.size / 1048576).toFixed(1) + 'MB → ' +
                (compressed.size / 1048576).toFixed(1) + 'MB');
        }
        return _doUpload(compressed, onProgress);
    });
}

function _doUpload(file, onProgress) {
    return new Promise(function (resolve, reject) {
        if (!file || !file.type.startsWith('image/'))
            return reject(new Error('Envie apenas imagens.'));

        var fd = new FormData();
        fd.append('file',          file);
        fd.append('upload_preset', UPLOAD_PRESET);

        var xhr = new XMLHttpRequest();
        xhr.open('POST', UPLOAD_URL);

        xhr.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable && typeof onProgress === 'function')
                onProgress(Math.round((e.loaded / e.total) * 100));
        });

        xhr.addEventListener('load', function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try   { resolve(JSON.parse(xhr.responseText).secure_url); }
                catch { reject(new Error('Resposta inválida do Cloudinary.')); }
            } else {
                /* Loga o corpo da resposta para diagnóstico */
                var detail = '';
                try { detail = JSON.parse(xhr.responseText).error.message; } catch {}
                console.error('[Cloudinary] Erro ' + xhr.status + ':', detail || xhr.responseText);
                reject(new Error('Cloudinary ' + xhr.status + (detail ? ': ' + detail : '')));
            }
        });

        xhr.addEventListener('error', function () { reject(new Error('Erro de rede no upload.')); });
        xhr.send(fd);
    });
}

/**
 * Sobe múltiplos arquivos em paralelo.
 * @param {File[]} files
 * @param {Function} [onProgress]
 * @returns {Promise<string[]>}
 */
async function uploadMultiple(files, onProgress) {
    if (!files || !files.length) return [];
    var progresses = new Array(files.length).fill(0);
    var report = function () {
        if (typeof onProgress !== 'function') return;
        onProgress(Math.round(progresses.reduce(function (a, b) { return a + b; }, 0) / files.length));
    };
    return Promise.all(files.map(function (f, i) {
        return uploadToCloudinary(f, function (p) { progresses[i] = p; report(); });
    }));
}

/* ══════════════════════════════════════════════════
   FIRESTORE HELPERS
   ══════════════════════════════════════════════════ */

async function fsGetProjects() {
    var q    = query(collection(fbDb, COLLECTION), orderBy('createdAt', 'desc'));
    var snap = await getDocs(q);
    return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
}

async function fsSaveProject(data, id) {
    var payload = {
        titulo:     data.titulo     || '',
        descricao:  data.descricao  || '',
        categoria:  data.categoria  || '',
        cliente:    data.cliente    || '',
        local:      data.local      || '',
        ano:        data.ano        || '',
        software:   data.software   || '',
        imagemCapa: data.imagemCapa || '',
        galeria:    data.galeria    || [],
        /* Compatibilidade: mantém imagem360 para projetos antigos */
        imagem360:  data.imagem360  || '',
        /* Novo campo para múltiplos panoramas */
        panoramas360: data.panoramas360 || [],
        destaque:   !!data.destaque,
        mostrar360: data.mostrar360 === true,
        updatedAt:  serverTimestamp(),
    };
    if (id) {
        await setDoc(doc(fbDb, COLLECTION, id), payload, { merge: true });
        return id;
    }
    payload.createdAt = serverTimestamp();
    var ref = await addDoc(collection(fbDb, COLLECTION), payload);
    return ref.id;
}

async function fsDeleteProject(id) {
    await deleteDoc(doc(fbDb, COLLECTION, id));
}

async function fsSaveConfig(data) {
    var configRef = doc(fbDb, COLLECTION, 'studio_config');
    await setDoc(configRef, data, { merge: true });
}

async function fsGetConfig() {
    var configRef = doc(fbDb, COLLECTION, 'studio_config');
    var snap = await getDoc(configRef);
    if (snap.exists()) {
        return snap.data();
    }
    return null;
}

/* ══════════════════════════════════════════════════
   DOM HELPERS
   ══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {

    function qs(sel, ctx)  { return (ctx || document).querySelector(sel); }
    function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

    /* ── TOAST ─────────────────────────────────── */
    function showToast(msg, type) {
        var toast = qs('#toast');
        if (!toast) return;
        var icon = type === 'error'
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
        toast.className = 'toast ' + (type || 'success');
        toast.innerHTML = icon + '<span>' + msg + '</span>';
        toast.classList.remove('hidden');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { toast.classList.add('hidden'); }, 3500);
    }

    function openModal(id)  { var m = qs('#' + id); if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; } }
    function closeModal(id) { var m = qs('#' + id); if (m) { m.classList.add('hidden');    document.body.style.overflow = '';       } }

    function setLoading(btn, loading) {
        if (!btn) return;
        btn.disabled = loading;
        btn._orig = btn._orig || btn.textContent;
        btn.textContent = loading ? 'Aguarde...' : btn._orig;
    }

    /* ── PROGRESS BAR ───────────────────────────── */
    function showProgress(container, percent) {
        var bar = qs('.upload-progress', container);
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'upload-progress';
            bar.innerHTML = '<div class="upload-progress-fill"></div><span class="upload-progress-label">0%</span>';
            container.appendChild(bar);
        }
        bar.querySelector('.upload-progress-fill').style.width = percent + '%';
        bar.querySelector('.upload-progress-label').textContent = percent + '%';
        if (percent >= 100) setTimeout(function () { bar.remove(); }, 800);
    }

    /* ── AUTH ──────────────────────────────────── */
    var loginScreen = qs('#login-screen');
    var adminPanel  = qs('#admin-panel');
    var panelInited = false;

    /* Garante estado inicial correto: login visível, painel oculto */
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (adminPanel)  adminPanel.classList.add('hidden');

    function showPanel(user) {
        if (loginScreen) loginScreen.classList.add('hidden');
        if (adminPanel)  adminPanel.classList.remove('hidden');

        if (user) {
            var displayName = user.displayName || user.email.split('@')[0];
            qsa('.user-name').forEach(function (el) { el.textContent = displayName; });
            qsa('.user-role').forEach(function (el) { el.textContent = user.email; });
            qsa('.user-avatar, .topbar-avatar').forEach(function (el) {
                el.textContent = displayName[0].toUpperCase();
            });
        }

        if (!panelInited) { panelInited = true; initPanel(); }
    }

    function showLogin() {
        if (loginScreen) loginScreen.classList.remove('hidden');
        if (adminPanel)  adminPanel.classList.add('hidden');
    }

    /* Observa estado de autenticação do Firebase */
    onAuthStateChanged(fbAuth, function (user) {
        if (user) { showPanel(user); }
        else      { showLogin(); }
    });

    /* Login form */
    var loginForm = qs('#login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var btn     = qs('.btn-login');
            var errorEl = qs('#login-error');
            errorEl.hidden = true;
            setLoading(btn, true);
            try {
                var email = qs('#login-email').value.trim();
                var pass  = qs('#login-pass').value;
                await signInWithEmailAndPassword(fbAuth, email, pass);
                /* onAuthStateChanged cuida do restante */
            } catch (err) {
                var msgs = {
                    'auth/invalid-credential':    'E-mail ou senha incorretos.',
                    'auth/user-not-found':         'Usuário não encontrado.',
                    'auth/wrong-password':         'Senha incorreta.',
                    'auth/too-many-requests':      'Muitas tentativas. Aguarde alguns minutos.',
                    'auth/invalid-email':          'E-mail inválido.',
                };
                errorEl.textContent = msgs[err.code] || 'Erro ao fazer login. Tente novamente.';
                errorEl.hidden = false;
            } finally {
                setLoading(btn, false);
            }
        });
    }

    /* Eye toggle */
    var eyeBtn    = qs('#btn-eye');
    var passInput = qs('#login-pass');
    if (eyeBtn && passInput) {
        eyeBtn.addEventListener('click', function () {
            passInput.type = passInput.type === 'password' ? 'text' : 'password';
        });
    }

    /* ── NAVIGATION ─────────────────────────────── */
    var titles = { dashboard: 'Dashboard', renders: 'Projetos', settings: 'Configurações' };

    function goTo(sectionId) {
        qsa('.nav-item[data-section]').forEach(function (n) {
            n.classList.toggle('active', n.dataset.section === sectionId);
        });
        qsa('.section').forEach(function (s) {
            s.classList.toggle('active', s.id === 'section-' + sectionId);
        });
        var pt = qs('#page-title');
        if (pt) pt.textContent = titles[sectionId] || sectionId;
        closeSidebar();
    }

    function openSidebar()  { var sb = qs('#sidebar'), ov = qs('#sidebar-overlay'); if (sb) sb.classList.add('open');    if (ov) ov.classList.remove('hidden'); }
    function closeSidebar() { var sb = qs('#sidebar'), ov = qs('#sidebar-overlay'); if (sb) sb.classList.remove('open'); if (ov) ov.classList.add('hidden');    }

    /* ── UPLOAD ZONES ───────────────────────────── */
    function bindUploadZone(zone, onFiles) {
        if (!zone) return;
        var input = zone.querySelector('.file-input');
        if (!input) return;
        input.addEventListener('change', function () { onFiles(Array.from(input.files)); input.value = ''; });
        zone.addEventListener('dragover',  function (e) { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', function ()  { zone.classList.remove('drag-over'); });
        zone.addEventListener('drop', function (e) {
            e.preventDefault(); zone.classList.remove('drag-over');
            onFiles(Array.from(e.dataTransfer.files));
        });
    }

    function addPreviewThumb(container, src, url, file) {
        var thumb = document.createElement('div');
        thumb.className = 'preview-thumb';
        if (url)  thumb._url  = url;
        if (file) thumb._file = file;
        thumb.innerHTML = '<img src="' + src + '" alt=""><span class="preview-remove" title="Remover">\u00d7</span>';
        thumb.querySelector('.preview-remove').addEventListener('click', function () { thumb.remove(); });
        container.appendChild(thumb);
        return thumb;
    }

    function previewFilesLocal(files, container) {
        files.forEach(function (file) {
            if (!file || !file.type.startsWith('image/')) return;
            var reader = new FileReader();
            reader.onload = function (e) { addPreviewThumb(container, e.target.result, null, file); };
            reader.readAsDataURL(file);
        });
    }

    /* ── DASHBOARD ──────────────────────────────── */
    async function loadDashboard() {
        try {
            var projects = await fsGetProjects();
            var total    = projects.length;
            var naHome   = projects.filter(function (p) { return p.destaque || p.mostrar360; }).length;
            var com360   = projects.filter(function (p) { return p.imagem360; }).length;
            var emProjetos = projects.filter(function (p) { return !p.destaque && !p.mostrar360; }).length;

            var s = function (id, v) { var el = qs('#' + id); if (el) el.textContent = v; };
            s('stat-renders',   total);
            s('stat-tours',     com360);
            s('stat-published', naHome);
            s('stat-draft',     emProjetos);

            var br = qs('#badge-renders');
            if (br) { br.textContent = total;  br.style.display = total  ? 'flex' : 'none'; }

            var list = qs('#recent-list');
            if (!list) return;

            if (!projects.length) {
                list.innerHTML = '<div class="empty-state"><p>Nenhum projeto ainda.</p></div>';
                return;
            }

            list.innerHTML = projects.slice(0, 5).map(function (item) {
                var thumb = item.imagemCapa
                    ? '<img src="' + item.imagemCapa + '" style="width:100%;height:100%;object-fit:cover">'
                    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
                var date = item.updatedAt && item.updatedAt.toDate
                    ? item.updatedAt.toDate().toISOString().slice(0, 10)
                    : (item.ano || '—');
                return '<div class="recent-item">' +
                    '<div class="recent-thumb">' + thumb + '</div>' +
                    '<div class="recent-info"><p class="recent-name">' + item.titulo + '</p>' +
                    '<p class="recent-meta">' + (item.categoria || '—') + ' · ' + date + '</p></div>' +
                    '<span class="status-badge ' + (item.destaque ? 'status-published' : 'status-draft') + '">' +
                    (item.destaque ? 'Destaque' : 'Normal') + '</span></div>';
            }).join('');
        } catch (err) { console.error('Dashboard error:', err); }
    }

    /* ── PROJETOS (Renders) ──────────────────────── */
    var editingId   = null;
    var filterAtivo = 'all';
    var allProjects = [];

    function buildProjectCard(item) {
        var card = document.createElement('div');
        card.className = 'media-card';
        card.dataset.id = item.id;

        var thumb = item.imagemCapa
            ? '<img class="media-card-thumb" src="' + item.imagemCapa + '" alt="' + item.titulo + '">'
            : '<div class="media-card-thumb-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';

        card.innerHTML = thumb +
            '<div class="media-card-body">' +
            '<p class="media-card-title">' + item.titulo + '</p>' +
            '<p class="media-card-meta">' + (item.categoria || '—') + (item.ano ? ' · ' + item.ano : '') + '</p>' +
            '<div class="media-card-footer">' +
            '<span class="status-badge ' + (item.destaque ? 'status-published' : 'status-draft') + '">' + (item.destaque ? 'Destaque' : 'Normal') + '</span>' +
            (item.imagem360 ? '<span class="status-badge" style="background:rgba(139,92,246,.15);color:#a78bfa;border-color:rgba(139,92,246,.25)">360°</span>' : '') +
            '<div class="card-actions">' +
            '<button class="btn-icon-sm btn-edit-project" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button class="btn-icon-sm btn-del-project delete" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>' +
            '</div></div></div>';

        card.querySelector('.btn-edit-project').addEventListener('click', function () { openEditProject(item); });
        card.querySelector('.btn-del-project').addEventListener('click', function () {
            pendingDelete = { id: item.id, titulo: item.titulo };
            qs('#delete-item-name').textContent = '"' + item.titulo + '"';
            openModal('modal-delete');
        });
        return card;
    }

    async function loadProjectsGrid() {
        var grid = qs('#renders-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="empty-state full"><p>Carregando...</p></div>';
        try {
            allProjects = await fsGetProjects();
            renderProjectsGrid();
        } catch (err) { showToast('Erro ao carregar projetos.', 'error'); }
    }

    function renderProjectsGrid() {
        var grid = qs('#renders-grid');
        if (!grid) return;
        grid.innerHTML = '';

        var list = allProjects.slice();
        if (filterAtivo === 'published') list = list.filter(function (i) { return i.destaque || i.mostrar360; });
        if (filterAtivo === 'draft')     list = list.filter(function (i) { return !i.destaque && !i.mostrar360; });

        var search = (qs('#search-renders') || {}).value || '';
        if (search) list = list.filter(function (i) {
            return (i.titulo || '').toLowerCase().includes(search.toLowerCase());
        });

        if (!list.length) {
            grid.innerHTML = '<div class="empty-state full">' +
                '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>' +
                '<h3>Nenhum projeto</h3><p>Clique em "Novo Projeto" para adicionar.</p>' +
                '<button class="btn-primary" id="btn-new-render-empty"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Adicionar Projeto</button>' +
                '</div>';
            var btnE = qs('#btn-new-render-empty');
            if (btnE) btnE.addEventListener('click', function () { resetProjectForm(); openModal('modal-render'); });
            return;
        }
        list.forEach(function (item) { grid.appendChild(buildProjectCard(item)); });
    }

    function openEditProject(item) {
        editingId = item.id;
        qs('#render-title').value    = item.titulo    || '';
        qs('#render-category').value = item.categoria || '';
        qs('#render-year').value     = item.ano       || '';
        qs('#render-software').value = item.software  || '';
        qs('#render-desc').value     = item.descricao || '';
        if (qs('#render-cliente'))   qs('#render-cliente').value   = item.cliente  || '';
        if (qs('#render-local'))     qs('#render-local').value     = item.local    || '';
        if (qs('#render-published')) qs('#render-published').checked = !!item.destaque;
        if (qs('#render-show360'))    qs('#render-show360').checked    = !!item.mostrar360;

        /* Preview capa */
        var pc = qs('#preview-cover');
        if (pc) {
            pc.innerHTML = '';
            if (item.imagemCapa) addPreviewThumb(pc, item.imagemCapa, item.imagemCapa, null);
        }

        /* Preview galeria */
        var pr = qs('#preview-render');
        if (pr) {
            pr.innerHTML = '';
            (item.galeria || []).forEach(function (url) {
                addPreviewThumb(pr, url, url, null);
            });
        }

        /* Preview 360 - Compatibilidade com projetos antigos */
        var p360 = qs('#preview-360');
        if (p360) {
            p360.innerHTML = '';
            /* Se tem panoramas360 (novo formato), usa array */
            if (Array.isArray(item.panoramas360) && item.panoramas360.length > 0) {
                item.panoramas360.forEach(function(pano, idx) {
                    addPreviewThumb(p360, pano.url, pano.url, null);
                });
            }
            /* Se tem imagem360 (formato antigo), usa compatibilidade */
            else if (item.imagem360) {
                addPreviewThumb(p360, item.imagem360, item.imagem360, null);
            }
        }

        qs('#modal-render-title').textContent = 'Editar Projeto';
        openModal('modal-render');
    }

    function resetProjectForm() {
        var form = qs('#form-render');
        if (form) form.reset();
        var els = ['#preview-cover', '#preview-render', '#preview-360'];
        els.forEach(function (sel) { var el = qs(sel); if (el) el.innerHTML = ''; });
        qs('#modal-render-title').textContent = 'Novo Projeto';
        editingId = null;
    }

    async function saveProject() {
        var titulo = (qs('#render-title') || {}).value;
        if (!titulo || !titulo.trim()) { if (qs('#render-title')) qs('#render-title').focus(); return; }

        var btn = qs('#btn-save-render');
        setLoading(btn, true);

        try {
            /* ── 1. Upload capa ── */
            var capaUrl = '';
            var pcThumbs = qsa('#preview-cover .preview-thumb');
            var capaThumb = pcThumbs[pcThumbs.length - 1];
            if (capaThumb && capaThumb._file) {
                showToast('Enviando capa...', 'success');
                capaUrl = await uploadToCloudinary(capaThumb._file, function (p) {
                    showProgress(qs('#preview-cover'), p);
                });
            } else if (capaThumb && capaThumb._url) {
                capaUrl = capaThumb._url;
            }

            /* ── 2. Upload galeria ── */
            var galeriaUrls = [];
            var prThumbs = qsa('#preview-render .preview-thumb');
            var galeriaFiles = prThumbs.filter(function (t) { return !!t._file; }).map(function (t) { return t._file; });
            var galeriaExisting = prThumbs.filter(function (t) { return !!t._url; }).map(function (t) { return t._url; });

            if (galeriaFiles.length) {
                showToast('Enviando galeria (' + galeriaFiles.length + ' imagens)...', 'success');
                var novasUrls = await uploadMultiple(galeriaFiles, function (p) {
                    showProgress(qs('#preview-render'), p);
                });
                galeriaUrls = galeriaExisting.concat(novasUrls);
            } else {
                galeriaUrls = galeriaExisting;
            }

            /* ── 3. Upload panoramas 360 ── */
            var panoramas360 = [];
            var p360Thumbs = qsa('#preview-360 .preview-thumb');
            var p360Files = p360Thumbs.filter(function (t) { return !!t._file; }).map(function (t) { return t._file; });
            var p360Existing = p360Thumbs.filter(function (t) { return !!t._url; }).map(function (t) { return t._url; });

            /* Compatibilidade: se tem apenas um panorama antigo, mantém imagem360 */
            var img360Url = editingId ? (allProjects.find(function(p){ return p.id === editingId; }) || {}).imagem360 || '' : '';

            if (p360Files.length) {
                showToast('Enviando panoramas 360° (' + p360Files.length + ' imagens)...', 'success');
                var novasUrls = await uploadMultiple(p360Files, function (p) {
                    showProgress(qs('#preview-360'), p);
                });
                /* Cria array de panoramas com IDs e nomes automáticos */
                var todasUrls = p360Existing.concat(novasUrls);
                panoramas360 = todasUrls.map(function(url, idx) {
                    return {
                        id: 'pano_' + Date.now() + '_' + idx,
                        nome: 'Panorama ' + (idx + 1),
                        url: url
                    };
                });
                /* Para compatibilidade, mantém o primeiro panorama em imagem360 */
                img360Url = todasUrls[0] || '';
            } else if (p360Existing.length) {
                /* Se não tem novos arquivos mas tem existentes, mantém array atual */
                var existingProject = editingId ? (allProjects.find(function(p){ return p.id === editingId; }) || {}) : {};
                if (Array.isArray(existingProject.panoramas360) && existingProject.panoramas360.length > 0) {
                    panoramas360 = existingProject.panoramas360;
                    img360Url = existingProject.panoramas360[0].url || '';
                } else if (p360Existing.length > 0) {
                    /* Converte formato antigo para novo */
                    panoramas360 = p360Existing.map(function(url, idx) {
                        return {
                            id: 'pano_' + Date.now() + '_' + idx,
                            nome: 'Panorama ' + (idx + 1),
                            url: url
                        };
                    });
                    img360Url = p360Existing[0] || '';
                }
            }

            /* ── 4. Salva no Firestore ── */
            var payload = {
                titulo:     titulo.trim(),
                descricao:  (qs('#render-desc')      || {}).value || '',
                categoria:  (qs('#render-category')  || {}).value || '',
                cliente:    (qs('#render-cliente')   || {}).value || '',
                local:      (qs('#render-local')     || {}).value || '',
                ano:        (qs('#render-year')      || {}).value || '',
                software:   (qs('#render-software')  || {}).value || '',
                imagemCapa: capaUrl,
                galeria:    galeriaUrls,
                imagem360:  img360Url,
                panoramas360: panoramas360,
                destaque:   !!(qs('#render-published') || {}).checked,
                mostrar360: !!(qs('#render-show360')    || {}).checked,
            };

            await fsSaveProject(payload, editingId);
            showToast(editingId ? 'Projeto atualizado!' : 'Projeto salvo no Firestore!');

            resetProjectForm();
            closeModal('modal-render');
            await loadProjectsGrid();
            await loadDashboard();
        } catch (err) {
            showToast('Erro: ' + err.message, 'error');
        } finally {
            setLoading(btn, false);
        }
    }

    /* ── DELETE ──────────────────────────────────── */
    var pendingDelete = null;

    var btnConfirmDelete = qs('#btn-confirm-delete');
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async function () {
            if (!pendingDelete) return;
            setLoading(btnConfirmDelete, true);
            try {
                await fsDeleteProject(pendingDelete.id);
                await loadProjectsGrid();
                await loadDashboard();
                closeModal('modal-delete');
                showToast('Projeto excluído.', 'error');
                pendingDelete = null;
            } catch (err) {
                showToast('Erro ao excluir: ' + err.message, 'error');
            } finally {
                setLoading(btnConfirmDelete, false);
            }
        });
    }

    /* ── INIT PANEL ─────────────────────────────── */
    function initPanel() {
        /* Navigation */
        qsa('.nav-item[data-section]').forEach(function (item) {
            item.addEventListener('click', function (e) { e.preventDefault(); goTo(item.dataset.section); });
        });
        var ham = qs('#btn-hamburger'); if (ham) ham.addEventListener('click', openSidebar);
        var sc2 = qs('#sidebar-close'); if (sc2) sc2.addEventListener('click', closeSidebar);
        var ov2 = qs('#sidebar-overlay'); if (ov2) ov2.addEventListener('click', closeSidebar);

        /* data-goto */
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-goto]');
            if (!btn) return;
            goTo(btn.dataset.goto);
        });

        /* Modal close */
        document.addEventListener('click', function (e) {
            var trigger = e.target.closest('[data-modal]');
            if (trigger) closeModal(trigger.dataset.modal);
            if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') qsa('.modal-overlay:not(.hidden)').forEach(function (m) { closeModal(m.id); });
        });

        /* Logout */
        var logoutBtn = qs('#btn-logout');
        if (logoutBtn) logoutBtn.addEventListener('click', function () { signOut(fbAuth); });

        /* ── Botões Novo Projeto ── */
        var btnNR = qs('#btn-new-render');
        if (btnNR) btnNR.addEventListener('click', function () { resetProjectForm(); openModal('modal-render'); });
        var btnSR = qs('#btn-save-render');
        if (btnSR) btnSR.addEventListener('click', saveProject);

        /* ── Upload zones ── */
        bindUploadZone(qs('#upload-zone-cover'), function (files) {
            var pc = qs('#preview-cover');
            if (pc) { pc.innerHTML = ''; previewFilesLocal([files[0]], pc); }
        });
        bindUploadZone(qs('#upload-zone-render'), function (files) {
            previewFilesLocal(files, qs('#preview-render'));
        });
        bindUploadZone(qs('#upload-zone-360'), function (files) {
            var p360 = qs('#preview-360');
            if (p360) { p360.innerHTML = ''; previewFilesLocal(files, p360); }
        });

        /* ── Filtros e busca ── */
        qsa('#section-renders .ftab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                qsa('#section-renders .ftab').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                filterAtivo = btn.dataset.filter;
                renderProjectsGrid();
            });
        });
        var sr = qs('#search-renders'); if (sr) sr.addEventListener('input', renderProjectsGrid);

        /* ── Configurações do Estúdio ── */
        var formInfo = qs('#form-info');
        if (formInfo) {
            formInfo.addEventListener('submit', async function (e) {
                e.preventDefault();
                var btn = formInfo.querySelector('button[type="submit"]');
                setLoading(btn, true);
                try {
                    var config = {
                        studioName: qs('#setting-studio-name').value,
                        specialty: qs('#setting-specialty').value,
                        heroDesc: qs('#setting-hero-desc').value,
                        whatsapp: qs('#setting-whatsapp').value,
                        email: qs('#setting-email').value,
                        instagram: qs('#setting-instagram').value,
                        updatedAt: serverTimestamp(),
                    };
                    await fsSaveConfig(config);
                    showToast('Configurações salvas!', 'success');
                } catch (err) {
                    showToast('Erro ao salvar: ' + err.message, 'error');
                } finally {
                    setLoading(btn, false);
                }
            });
        }

        async function loadConfig() {
            try {
                var config = await fsGetConfig();
                if (config) {
                    if (qs('#setting-studio-name')) qs('#setting-studio-name').value = config.studioName || 'DSC Studio';
                    if (qs('#setting-specialty')) qs('#setting-specialty').value = config.specialty || 'Visualização Arquitetônica';
                    if (qs('#setting-hero-desc')) qs('#setting-hero-desc').value = config.heroDesc || '';
                    if (qs('#setting-whatsapp')) qs('#setting-whatsapp').value = config.whatsapp || '';
                    if (qs('#setting-email')) qs('#setting-email').value = config.email || '';
                    if (qs('#setting-instagram')) qs('#setting-instagram').value = config.instagram || '';
                }
            } catch (err) {
                console.error('Erro ao carregar configurações:', err);
            }
        }

        /* ── Alterar Senha ── */
        var formPassword = qs('#form-password');
        if (formPassword) {
            formPassword.addEventListener('submit', async function (e) {
                e.preventDefault();
                var currentPass = qs('#pass-current').value;
                var newPass = qs('#pass-new').value;
                var confirmPass = qs('#pass-confirm').value;
                var btn = formPassword.querySelector('button[type="submit"]');
                
                // Validações
                if (!currentPass || !newPass || !confirmPass) {
                    showToast('Preencha todos os campos.', 'error');
                    return;
                }
                if (newPass.length < 6) {
                    showToast('A nova senha deve ter pelo menos 6 caracteres.', 'error');
                    return;
                }
                if (newPass !== confirmPass) {
                    showToast('A nova senha e a confirmação não coincidem.', 'error');
                    return;
                }
                if (currentPass === newPass) {
                    showToast('A nova senha deve ser diferente da atual.', 'error');
                    return;
                }
                
                setLoading(btn, true);
                try {
                    var user = fbAuth.currentUser;
                    if (!user) {
                        showToast('Usuário não autenticado.', 'error');
                        setLoading(btn, false);
                        return;
                    }
                    
                    // Reautentica com a senha atual
                    var credential = EmailAuthProvider.credential(user.email, currentPass);
                    await reauthenticateWithCredential(user, credential);
                    
                    // Atualiza a senha
                    await updatePassword(user, newPass);
                    
                    showToast('Senha alterada com sucesso!', 'success');
                    formPassword.reset();
                } catch (err) {
                    var msgs = {
                        'auth/wrong-password': 'Senha atual incorreta.',
                        'auth/weak-password': 'A senha é muito fraca.',
                        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
                        'auth/requires-recent-login': 'Você precisa fazer login novamente para alterar a senha.',
                    };
                    showToast(msgs[err.code] || 'Erro ao alterar senha: ' + err.message, 'error');
                } finally {
                    setLoading(btn, false);
                }
            });
        }

        /* ── Carregar dados ── */
        loadProjectsGrid();
        loadDashboard();
        loadConfig();
    }

});
