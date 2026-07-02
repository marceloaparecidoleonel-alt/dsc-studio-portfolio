/**
 * firebase.js
 * DSC Studio — Configuração e helpers Firebase
 *
 * Exporta: app, auth, db
 * Helpers: getProjects, getProject, saveProject, deleteProject
 */

import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth }                                from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ── CONFIG ────────────────────────────────────── */
const firebaseConfig = {
    apiKey:            'AIzaSyCOT0XBp61Ubj01Os-47OYAAkkbTfJZ6xI',
    authDomain:        'dsc-studio-40d03.firebaseapp.com',
    projectId:         'dsc-studio-40d03',
    storageBucket:     'dsc-studio-40d03.firebasestorage.app',
    messagingSenderId: '1015858327785',
    appId:             '1:1015858327785:web:c4af0e28bce4dd05a5c078',
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const COLLECTION = 'projetos';

/* ── HELPERS FIRESTORE ──────────────────────────── */

/**
 * Busca todos os projetos ordenados por data de criação (mais recente primeiro)
 * @returns {Promise<Array>}
 */
async function getProjects() {
    const q    = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Busca um único projeto por ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getProject(id) {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/**
 * Salva (cria ou atualiza) um projeto no Firestore
 * @param {Object} data   — dados do projeto
 * @param {string} [id]   — se passado, atualiza; caso contrário, cria
 * @returns {Promise<string>} ID do documento
 */
async function saveProject(data, id) {
    const payload = {
        titulo:      data.titulo      || '',
        descricao:   data.descricao   || '',
        categoria:   data.categoria   || '',
        cliente:     data.cliente     || '',
        local:       data.local       || '',
        ano:         data.ano         || '',
        software:    data.software    || '',
        imagemCapa:  data.imagemCapa  || '',
        galeria:     data.galeria     || [],
        imagem360:   data.imagem360   || '',
        destaque:    data.destaque    || false,
        mostrar360:  data.mostrar360  || false,
        updatedAt:   serverTimestamp(),
    };

    if (id) {
        /* Atualiza documento existente */
        await setDoc(doc(db, COLLECTION, id), payload, { merge: true });
        return id;
    } else {
        /* Cria novo documento */
        payload.createdAt = serverTimestamp();
        const ref = await addDoc(collection(db, COLLECTION), payload);
        return ref.id;
    }
}

/**
 * Exclui um projeto do Firestore
 * @param {string} id
 */
async function deleteProject(id) {
    await deleteDoc(doc(db, COLLECTION, id));
}

export { app, auth, db, getProjects, getProject, saveProject, deleteProject };
