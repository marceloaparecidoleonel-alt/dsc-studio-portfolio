const ParticlesModule = (() => {
    let canvas, ctx, particles = [], animId;
    let W, H, tick = 0;

    const C1 = '37, 99, 235';   /* azul primário */
    const C2 = '59, 130, 246';  /* azul claro */
    const C3 = '147, 197, 253'; /* azul pálido */

    const CFG = {
        count:        90,
        connDist:     150,
        mouseRadius:  160,
        speed:        0.28,
    };

    let mouse = { x: null, y: null, vx: 0, vy: 0 };
    let lastMouse = { x: 0, y: 0 };

    function rand(a, b) { return Math.random() * (b - a) + a; }
    function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
    function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

    /* ---- tipos de partícula ---- */
    function createParticle() {
        const type = rand(0, 1) < 0.15 ? 'pulse' : 'dot';
        const speed = rand(CFG.speed * 0.4, CFG.speed * 1.6);
        const angle = rand(0, Math.PI * 2);
        return {
            type,
            x:       rand(0, W),
            y:       rand(0, H),
            r:       type === 'pulse' ? rand(1.8, 3.2) : rand(0.6, 1.8),
            baseR:   0,
            vx:      Math.cos(angle) * speed,
            vy:      Math.sin(angle) * speed,
            color:   pick([C1, C2, C2, C3]),
            opacity: rand(0.25, 0.7),
            phase:   rand(0, Math.PI * 2),    /* para pulsar */
            freq:    rand(0.008, 0.022),
        };
    }

    /* ---- setup ---- */
    function init() {
        canvas = document.getElementById('particles-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        resize();
        particles = Array.from({ length: CFG.count }, createParticle);

        window.addEventListener('resize', debounce(resize, 200));

        /* mouse tracking com velocidade */
        window.addEventListener('mousemove', e => {
            const nx = e.clientX;
            const ny = e.clientY;
            mouse.vx = nx - lastMouse.x;
            mouse.vy = ny - lastMouse.y;
            lastMouse.x = mouse.x = nx;
            lastMouse.y = mouse.y = ny;
        });
        window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function resize() {
        if (!canvas) return;
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function debounce(fn, ms) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    /* ---- loop principal ---- */
    function loop() {
        tick++;
        ctx.clearRect(0, 0, W, H);
        update();
        drawConnections();
        drawParticles();
        animId = requestAnimationFrame(loop);
    }

    /* ---- update ---- */
    function update() {
        for (const p of particles) {
            /* movimento base */
            p.x += p.vx;
            p.y += p.vy;

            /* wrap suave nas bordas */
            if (p.x < -20) p.x = W + 20;
            else if (p.x > W + 20) p.x = -20;
            if (p.y < -20) p.y = H + 20;
            else if (p.y > H + 20) p.y = -20;

            /* pulso de opacidade e tamanho */
            const wave = Math.sin(tick * p.freq + p.phase);
            if (p.type === 'pulse') {
                p.currentR = p.r + wave * p.r * 0.6;
                p.currentOpacity = p.opacity + wave * 0.15;
            } else {
                p.currentR = p.r + wave * 0.3;
                p.currentOpacity = p.opacity + wave * 0.08;
            }
            p.currentOpacity = Math.max(0.05, Math.min(0.85, p.currentOpacity));

            /* interação com mouse */
            if (mouse.x !== null) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist2 = dx * dx + dy * dy;
                const r2 = CFG.mouseRadius * CFG.mouseRadius;
                if (dist2 < r2) {
                    const dist = Math.sqrt(dist2);
                    const force = (1 - dist / CFG.mouseRadius);
                    /* repulsão suave */
                    p.vx += (dx / dist) * force * 0.06;
                    p.vy += (dy / dist) * force * 0.06;
                    /* velocidade máxima */
                    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                    if (speed > CFG.speed * 3) {
                        p.vx = (p.vx / speed) * CFG.speed * 3;
                        p.vy = (p.vy / speed) * CFG.speed * 3;
                    }
                } else {
                    /* damping gradual para voltar à velocidade base */
                    p.vx *= 0.995;
                    p.vy *= 0.995;
                }
            }
        }
    }

    /* ---- desenha conexões com gradiente ---- */
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            const a = particles[i];
            for (let j = i + 1; j < particles.length; j++) {
                const b = particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CFG.connDist) {
                    const t = 1 - dist / CFG.connDist;
                    /* linha com gradiente entre as duas cores */
                    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
                    const alphaA = t * a.currentOpacity * 0.5;
                    const alphaB = t * b.currentOpacity * 0.5;
                    grad.addColorStop(0, `rgba(${a.color}, ${alphaA})`);
                    grad.addColorStop(1, `rgba(${b.color}, ${alphaB})`);
                    ctx.beginPath();
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = t * 0.9;
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }
    }

    /* ---- desenha partículas ---- */
    function drawParticles() {
        for (const p of particles) {
            const r = p.currentR || p.r;
            const op = p.currentOpacity || p.opacity;

            if (p.type === 'pulse') {
                /* glow externo */
                const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
                glow.addColorStop(0,   `rgba(${p.color}, ${op * 0.6})`);
                glow.addColorStop(0.4, `rgba(${p.color}, ${op * 0.15})`);
                glow.addColorStop(1,   `rgba(${p.color}, 0)`);
                ctx.beginPath();
                ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
                ctx.fillStyle = glow;
                ctx.fill();
            }

            /* núcleo */
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color}, ${op})`;
            ctx.fill();
        }
    }

    return { init };
})();

export default ParticlesModule;
