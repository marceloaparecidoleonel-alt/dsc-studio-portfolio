/**
 * cloudinary.js
 * DSC Studio — Upload de imagens via Cloudinary
 *
 * Sem Firebase Storage. As URLs públicas retornadas são salvas no Firestore.
 *
 * Exporta:
 *   uploadImage(file, onProgress?)  → Promise<string>  URL pública
 *   uploadMultiple(files, onProgress?) → Promise<string[]>
 */

const CLOUD_NAME    = 'dvin8hkmv';
const UPLOAD_PRESET = 'dsc-studio';
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Faz upload de um único arquivo para o Cloudinary.
 *
 * @param {File}     file        — arquivo de imagem
 * @param {Function} [onProgress] — callback(percent: number)
 * @returns {Promise<string>}    — URL pública da imagem
 */
function uploadImage(file, onProgress) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            return reject(new Error('Arquivo inválido. Envie uma imagem.'));
        }

        const fd = new FormData();
        fd.append('file',         file);
        fd.append('upload_preset', UPLOAD_PRESET);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', UPLOAD_URL);

        /* Progresso */
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && typeof onProgress === 'function') {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve(data.secure_url);
                } catch {
                    reject(new Error('Resposta inválida do Cloudinary.'));
                }
            } else {
                reject(new Error(`Cloudinary error ${xhr.status}: ${xhr.statusText}`));
            }
        });

        xhr.addEventListener('error',  () => reject(new Error('Erro de rede ao fazer upload.')));
        xhr.addEventListener('abort',  () => reject(new Error('Upload cancelado.')));

        xhr.send(fd);
    });
}

/**
 * Faz upload de múltiplos arquivos em paralelo.
 *
 * @param {File[]}   files
 * @param {Function} [onProgress]  — callback(overallPercent: number)
 * @returns {Promise<string[]>}    — array de URLs públicas
 */
async function uploadMultiple(files, onProgress) {
    if (!files || !files.length) return [];

    const progresses = new Array(files.length).fill(0);

    const updateOverall = () => {
        if (typeof onProgress !== 'function') return;
        const total = progresses.reduce((a, b) => a + b, 0);
        onProgress(Math.round(total / files.length));
    };

    const uploads = files.map((file, i) =>
        uploadImage(file, (p) => {
            progresses[i] = p;
            updateOverall();
        })
    );

    return Promise.all(uploads);
}

export { uploadImage, uploadMultiple };
