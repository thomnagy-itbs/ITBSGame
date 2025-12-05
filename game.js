// --- AUDIO ENGINE ---
const AudioEngine = {
    ctx: null, masterGain: null, droneNodes: [],
    delayNode: null, feedbackNode: null, delayFilter: null,
    noiseGain: null, noiseFilter: null, rainInterval: null,
    SCALE: { C2: 65.41, G2: 98.00, C3: 130.81, Eb3: 155.56, F3: 174.61, G3: 196.00, Bb3: 233.08, C4: 261.63, Eb4: 311.13, F4: 349.23, G4: 392.00, Bb4: 466.16, C5: 523.25, Eb5: 622.25 },

    init: function (playAmbience = true) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
        if (playAmbience) {
            this.startDrone(); this.setupDelayChain(); this.setupNoiseLayer(); this.startRainLoop();
        }
    },
    startDrone: function () {
        [this.SCALE.C2, this.SCALE.G2, this.SCALE.C3].forEach(f => {
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'sine'; osc.frequency.value = f; gain.gain.value = 0;
            osc.connect(gain); gain.connect(this.masterGain); osc.start();
            gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 4);
            this.droneNodes.push({ osc: osc, baseFreq: f });
        });
    },
    setupDelayChain: function () {
        this.delayNode = this.ctx.createDelay(); this.delayNode.delayTime.value = 0.45;
        this.feedbackNode = this.ctx.createGain(); this.feedbackNode.gain.value = 0.4;
        this.delayFilter = this.ctx.createBiquadFilter(); this.delayFilter.frequency.value = 1000;
        this.delayNode.connect(this.feedbackNode); this.feedbackNode.connect(this.delayFilter);
        this.delayFilter.connect(this.delayNode); this.delayNode.connect(this.masterGain);
    },
    setupNoiseLayer: function () {
        const bS = this.ctx.sampleRate * 2; const buff = this.ctx.createBuffer(1, bS, this.ctx.sampleRate);
        const d = buff.getChannelData(0); for (let i = 0; i < bS; i++) d[i] = Math.random() * 2 - 1;
        const n = this.ctx.createBufferSource(); n.buffer = buff; n.loop = true;
        this.noiseFilter = this.ctx.createBiquadFilter(); this.noiseFilter.type = 'lowpass'; this.noiseFilter.frequency.value = 100;
        this.noiseGain = this.ctx.createGain(); this.noiseGain.gain.value = 0;
        n.connect(this.noiseFilter); this.noiseFilter.connect(this.noiseGain); this.noiseGain.connect(this.masterGain); n.start();
    },
    triggerRainNote: function () {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator(); const env = this.ctx.createGain();
        const k = ['C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5', 'Eb5'];
        osc.frequency.value = this.SCALE[k[Math.floor(Math.random() * k.length)]]; osc.type = 'sine';
        env.gain.setValueAtTime(0, this.ctx.currentTime); env.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
        osc.connect(env); env.connect(this.masterGain); env.connect(this.delayNode);
        osc.start(); osc.stop(this.ctx.currentTime + 1.5);
    },
    startRainLoop: function () {
        if (this.rainInterval) clearInterval(this.rainInterval);
        this.rainInterval = setInterval(() => { if (Math.random() > 0.4) this.triggerRainNote(); }, 1200);
    },
    updateStress: function (confusion) {
        if (!this.ctx) return;
        const s = confusion / 100;
        this.noiseFilter.frequency.setTargetAtTime(100 + Math.pow(s, 2) * 4000, this.ctx.currentTime, 0.2);
        this.noiseGain.gain.setTargetAtTime(0.05 + (s * 0.25), this.ctx.currentTime, 0.2);
        this.droneNodes.forEach((n, i) => {
            n.osc.detune.setTargetAtTime((i % 2 === 0 ? 1 : -1) * (s * 25), this.ctx.currentTime, 0.1);
        });
        this.feedbackNode.gain.setTargetAtTime(0.4 + (s * 0.45), this.ctx.currentTime, 0.2);
    },
    playHealSound: function () {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.frequency.setValueAtTime(220, this.ctx.currentTime); o.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.2);
        g.gain.setValueAtTime(0.3, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        o.connect(g); g.connect(this.masterGain); o.start(); o.stop(this.ctx.currentTime + 0.5);
    },
    playWinChord: function () {
        if (!this.ctx) return;
        [this.SCALE.C4, this.SCALE.Eb4, this.SCALE.G4, this.SCALE.C5].forEach((n, i) => {
            setTimeout(() => {
                const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.frequency.value = n;
                g.gain.setValueAtTime(0, this.ctx.currentTime); g.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);
                o.connect(g); g.connect(this.masterGain); o.start(); o.stop(this.ctx.currentTime + 2.0);
            }, i * 100);
        });
    },
    stopAllSounds: function () {
        if (this.rainInterval) clearInterval(this.rainInterval);
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
        }
    },
    playGameOverSound: function () {
        this.init(false);
        const now = this.ctx.currentTime;

        // Constant sub bass drone dropping in pitch
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(100, now);
        sub.frequency.exponentialRampToValueAtTime(30, now + 3.0);
        subGain.gain.setValueAtTime(0.4, now);
        subGain.gain.linearRampToValueAtTime(0, now + 3.0);
        sub.connect(subGain); subGain.connect(this.masterGain);
        sub.start(now); sub.stop(now + 3.0);

        // Rhythmic pulses on top
        const count = 16;
        for (let i = 0; i < count; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = 300 * Math.pow(0.85, i);
            gain.gain.setValueAtTime(0.2 * Math.pow(0.8, i), now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.12);
            osc.connect(gain); gain.connect(this.masterGain);
            osc.start(now + i * 0.15); osc.stop(now + i * 0.15 + 0.12);
        }
    }
};




// --- GAME LOGIC ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const barFill = document.getElementById('bar-fill');
const statusLabel = document.getElementById('status-label');
const serverCountLabel = document.getElementById('server-count');
const overlay = document.getElementById('overlay-msg');
const startScreen = document.getElementById('start-screen');
const btnStart = document.getElementById('btn-start');
const uiPanel = document.getElementById('ui-panel');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const COLORS = {
    bg: '#0f0e17', player: '#fffffe',
    rumorCore: '#ef4565', rumorDark: '#2a0a12', rumorGlitch: '#ff00ff',
    anchorPending: '#3da9fc', anchorCharging: '#ff8906', anchorDone: '#2cb67d',
    colleagueNeutral: '#94a1b2', colleagueInfected: '#ff8906',
    particles: ['#fffffe', '#2cb67d', '#3da9fc']
};

// --- GAME CONFIG (All Magic Numbers) ---
const CONFIG = {
    player: {
        size: 16,
        speed: 4,
        trailLength: 12
    },
    rumors: {
        count: 11,
        baseSize: 25,
        sizeVariance: 30,          // Added to baseSize with Math.pow(random, 2)
        damagePerSecond: 0.6,
        reducedDamageThreshold: 66, // Confusion level where damage is halved
        reducedDamageMultiplier: 0.5,
        collisionRadius: 90,       // Base collision distance (scaled by stress)
        pushDecay: 0.92,           // Friction on shockwave push
        shockwaveForce: 25,
        shockwaveRadius: 350
    },
    anchors: {
        count: 4,
        radius: 60,
        chargeRate: 0.4,
        decayRate: 0.5,
        completionBonus: 20,       // Confusion reduction on complete
        healingRate: 0.5          // Confusion reduction while standing on complete anchor
    },
    colleagues: {
        count: 8,
        speed: 1.0,
        infectionRadius: 60,       // Scaled by stress
        damageRadius: 50,
        healRadius: 30,
        healBonus: 15              // Confusion reduction on heal
    },
    stress: {
        scaleMultiplierBase: 1,
        scaleMultiplierMax: 1.3,
        slowFactorDivisor: 140,
        minSpeed: 0.5,
        passiveRecoveryRate: 0.05
    },
    grid: {
        size: 50,
        scrollSpeed: 20
    }
};

let player = { x: canvas.width / 2, y: canvas.height / 2, size: CONFIG.player.size, speed: CONFIG.player.speed, trail: [] };
let keys = {};
let confusion = 0;
let gameTime = 0;
let gameActive = false;
let isPaused = false;
let completedAnchors = 0;

const pauseOverlay = document.getElementById('pause-overlay');
const btnResume = document.getElementById('btn-resume');

const rumorTexts = [
    "Externe Berater", "Keine Strategie", "Führungsvakuum", "Ressourcenmangel",
    "Reorg der Reorg", "Silo-Denken", "Kontrollverlust", "Kopflosigkeit",
    "Aktionismus", "Hidden Agenda", "Buzzword-Bingo", "Change Müdigkeit",
    "Brain Drain", "Politics", "Ungewissheit", "Planlosigkeit"
];
const anchorTexts = [
    "Ticket schliessen", "Erfolgreich deployen", "User verstehen", "Design implementieren",
    "User Test durchführen", "Klar kommunizieren", "Ruhig bleiben",
    "Bug fixen", "Legacy Code löschen", "Automatisieren", "Wissen teilen",
    "Danke sagen", "Ehrliches Feedback", "Zuhören", "Kaffee holen",
    "Nein sagen", "Fokus finden", "Priorisieren", "BuyIT erstellen"
];
const rumors = [];
const anchors = [];
const particles = [];
const colleagues = [];
const shockwaves = [];
const resonanceNotes = [AudioEngine.SCALE.C4, AudioEngine.SCALE.Eb4, AudioEngine.SCALE.G4, AudioEngine.SCALE.Bb4, AudioEngine.SCALE.C5];

function initGame() {
    for (let i = 0; i < CONFIG.rumors.count; i++) {
        rumors.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            text: rumorTexts[Math.floor(Math.random() * rumorTexts.length)],
            vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
            size: CONFIG.rumors.baseSize + Math.pow(Math.random(), 2) * CONFIG.rumors.sizeVariance,
            pulseOffset: Math.random() * 10, debrisAngle: Math.random() * Math.PI,
            pushX: 0, pushY: 0
        });
    }
    for (let i = 0; i < CONFIG.colleagues.count; i++) {
        colleagues.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * CONFIG.colleagues.speed,
            vy: (Math.random() - 0.5) * CONFIG.colleagues.speed,
            isInfected: false, infectionTime: 0
        });
    }
    createAnchors();
}

function createAnchors() {
    const pad = 120; const midX = canvas.width / 2; const midY = canvas.height / 2;
    const quadrants = [
        [pad, midX - pad, pad, midY - pad], [midX + pad, canvas.width - pad, pad, midY - pad],
        [pad, midX - pad, midY + pad, canvas.height - pad], [midX + pad, canvas.width - pad, midY + pad, canvas.height - pad]
    ];

    // Shuffle anchorTexts to get unique random texts each game
    let availableTexts = [...anchorTexts].sort(() => 0.5 - Math.random());

    quadrants.forEach((q, index) => {
        anchors.push({
            x: q[0] + Math.random() * (q[1] - q[0]), y: q[2] + Math.random() * (q[3] - q[2]),
            text: availableTexts[index % availableTexts.length], radius: CONFIG.anchors.radius,
            rotation: Math.random() * Math.PI, progress: 0, isComplete: false, lastNoteIndex: -1,
            vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4
        });
    });
}

window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === 'Escape' && gameActive) togglePause();
});
window.addEventListener('keyup', e => keys[e.key] = false);

function togglePause() {
    isPaused = !isPaused;
    pauseOverlay.style.display = isPaused ? 'flex' : 'none';
    if (!isPaused) {
        lastTime = 0; // Reset delta time to prevent jump
        requestAnimationFrame(loop);
    }
}

btnStart.addEventListener('click', () => {
    AudioEngine.init(); startScreen.style.display = 'none'; uiPanel.style.display = 'block';
    initGame(); gameActive = true; requestAnimationFrame(loop);
});

btnResume.addEventListener('click', () => togglePause());

function spawnParticles(x, y, color, count = 1) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 1) * 3 - 1,
            life: 1.0, color: color || COLORS.particles[Math.floor(Math.random() * COLORS.particles.length)]
        });
    }
}

function gameOver(won) {
    gameActive = false;
    overlay.style.display = 'flex';
    const msgTitle = document.getElementById('msg-title');
    const msgDesc = document.getElementById('msg-desc');
    if (won) {
        AudioEngine.playWinChord();
        msgTitle.innerText = "KLARHEIT GEFUNDEN"; msgTitle.style.color = COLORS.anchorDone;
        msgDesc.innerText = "Du bist trotz Chaos wirksam geblieben.";
    } else {
        AudioEngine.stopAllSounds();
        AudioEngine.playGameOverSound();
        msgTitle.innerText = "FOKUS VERLOREN"; msgTitle.style.color = COLORS.rumorCore;
        msgDesc.innerText = "Deine Energie ist im Chaos verpufft.";
    }
}

let lastTime = 0;

function update(dt) {
    gameTime += 0.02 * dt;
    let stressScaleMultiplier = CONFIG.stress.scaleMultiplierBase + (confusion / 120) * CONFIG.stress.scaleMultiplierMax;
    let slowFactor = 1 - (confusion / CONFIG.stress.slowFactorDivisor);
    let currentSpeed = Math.max(CONFIG.stress.minSpeed, player.speed * slowFactor) * dt;

    if (keys['ArrowUp'] || keys['w']) player.y -= currentSpeed;
    if (keys['ArrowDown'] || keys['s']) player.y += currentSpeed;
    if (keys['ArrowLeft'] || keys['a']) player.x -= currentSpeed;
    if (keys['ArrowRight'] || keys['d']) player.x += currentSpeed;
    player.x = Math.max(10, Math.min(canvas.width - 10, player.x));
    player.y = Math.max(10, Math.min(canvas.height - 10, player.y));

    player.trail.push({ x: player.x, y: player.y, alpha: 1 });
    if (player.trail.length > CONFIG.player.trailLength) player.trail.shift();
    player.trail.forEach(t => t.alpha -= 0.08 * dt);

    let onAnyAnchor = false;
    anchors.forEach(a => {
        a.rotation += 0.01 * dt;
        let dist = Math.hypot(player.x - a.x, player.y - a.y);
        if (dist < a.radius) {
            onAnyAnchor = true;
            if (!a.isComplete) {
                a.progress += CONFIG.anchors.chargeRate * dt;
                let noteStep = Math.floor(a.progress / 20);
                if (noteStep > a.lastNoteIndex && noteStep < resonanceNotes.length) {
                    a.lastNoteIndex = noteStep;
                    spawnParticles(player.x, player.y, COLORS.anchorCharging, 5);
                }
                if (a.progress >= 100) {
                    a.progress = 100; a.isComplete = true; completedAnchors++;
                    serverCountLabel.innerText = `${completedAnchors}/${CONFIG.anchors.count} SYSTEMS`;
                    confusion -= CONFIG.anchors.completionBonus; AudioEngine.playWinChord(); spawnParticles(a.x, a.y, COLORS.anchorDone, 30);
                    if (completedAnchors === CONFIG.anchors.count) gameOver(true);
                }
            } else { confusion -= CONFIG.anchors.healingRate * dt; }
        } else if (!a.isComplete && a.progress > 0) {
            a.progress -= CONFIG.anchors.decayRate * dt; let currentStep = Math.floor(a.progress / 20);
            if (currentStep < a.lastNoteIndex) a.lastNoteIndex = currentStep;
        }

        // Anchor Physics (Drift & Bounce)
        if (!a.isComplete) {
            a.x += a.vx * dt; a.y += a.vy * dt;
            if (a.x < 60 || a.x > canvas.width - 60) a.vx *= -1;
            if (a.y < 60 || a.y > canvas.height - 60) a.vy *= -1;
        }
    });

    resolveCollisions(dt);

    let nearRumor = false;
    rumors.forEach(r => {
        // 1. NATURAL DRIFT (Slow)
        let naturalVx = (r.vx + Math.sin(gameTime + r.y / 100) * 0.5) * dt;

        // 2. APPLY SHOCKWAVE PUSH (With Decay)
        r.pushX *= Math.pow(CONFIG.rumors.pushDecay, dt);
        r.pushY *= Math.pow(CONFIG.rumors.pushDecay, dt);

        // 3. MOVE
        r.x += naturalVx + (r.pushX * dt);
        r.y += (r.vy * dt) + (r.pushY * dt);

        r.debrisAngle += 0.05 * dt;

        // Wrap around screen
        if (r.x < -150) r.x = canvas.width + 150; if (r.x > canvas.width + 150) r.x = -150;
        if (r.y < -50) r.y = canvas.height + 50; if (r.y > canvas.height + 50) r.y = -50;

        // Collision Player
        if (Math.hypot(player.x - r.x, player.y - r.y) < CONFIG.rumors.collisionRadius * stressScaleMultiplier) {
            let damage = CONFIG.rumors.damagePerSecond;
            // Last third of life energy - reduced damage
            if (confusion > CONFIG.rumors.reducedDamageThreshold) damage *= CONFIG.rumors.reducedDamageMultiplier;

            confusion += damage * dt;
            nearRumor = true;
        }
        // Infection
        colleagues.forEach(c => {
            if (!c.isInfected && Math.hypot(c.x - r.x, c.y - r.y) < (CONFIG.colleagues.infectionRadius * stressScaleMultiplier)) { c.isInfected = true; c.infectionTime = gameTime; }
        });
    });

    colleagues.forEach(c => {
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.x < 0 || c.x > canvas.width) c.vx *= -1;
        if (c.y < 0 || c.y > canvas.height) c.vy *= -1;
        if (c.isInfected) {
            if (Math.hypot(player.x - c.x, player.y - c.y) < CONFIG.colleagues.damageRadius) {
                confusion += 0.3 * dt;
                if (Math.hypot(player.x - c.x, player.y - c.y) < CONFIG.colleagues.healRadius) {
                    // HEAL EVENT
                    c.isInfected = false;
                    confusion = Math.max(0, confusion - CONFIG.colleagues.healBonus);
                    AudioEngine.playHealSound();
                    spawnHealingParticles(c.x, c.y);

                    shockwaves.push({ x: c.x, y: c.y, r: 10, alpha: 1.0 });

                    // APPLY FORCE TO PUSH VARIABLES
                    rumors.forEach(r => {
                        let dx = r.x - c.x; let dy = r.y - c.y;
                        let dist = Math.hypot(dx, dy);
                        if (dist < CONFIG.rumors.shockwaveRadius) {
                            let angle = Math.atan2(dy, dx);
                            let force = CONFIG.rumors.shockwaveForce;
                            r.pushX += Math.cos(angle) * force;
                            r.pushY += Math.sin(angle) * force;
                        }
                    });
                }
            }
        }
    });

    for (let i = shockwaves.length - 1; i >= 0; i--) {
        shockwaves[i].r += 10 * dt;
        shockwaves[i].alpha -= 0.05 * dt;
        if (shockwaves[i].alpha <= 0) shockwaves.splice(i, 1);
    }

    if (!nearRumor && !onAnyAnchor && confusion > 0) confusion -= CONFIG.stress.passiveRecoveryRate * dt;
    confusion = Math.max(0, Math.min(100, confusion));
    AudioEngine.updateStress(confusion);
    if (confusion >= 100) gameOver(false);

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].vx * dt; particles[i].y += particles[i].vy * dt;
        particles[i].life -= 0.03 * dt;
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    let healthPct = 100 - confusion;
    barFill.style.width = `${healthPct}%`;
    if (healthPct > 60) { barFill.style.backgroundColor = '#2cb67d'; statusLabel.innerText = "STATUS: STABIL"; statusLabel.style.color = "#2cb67d"; }
    else if (healthPct > 30) { barFill.style.backgroundColor = '#ff8906'; statusLabel.innerText = "STATUS: UNSICHER"; statusLabel.style.color = "#ff8906"; }
    else { barFill.style.backgroundColor = '#ef4565'; statusLabel.innerText = "STATUS: PANIK"; statusLabel.style.color = "#ef4565"; }
    canvas.style.filter = `blur(${Math.floor(confusion / 20)}px)`;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Restored Element)
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.15)'; // Subtle Magenta
    ctx.lineWidth = 1;
    const gridSize = CONFIG.grid.size;
    const offset = (gameTime * CONFIG.grid.scrollSpeed) % gridSize;

    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = offset; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    anchors.forEach(a => {
        ctx.save(); ctx.translate(a.x, a.y);
        let mainColor = a.isComplete ? COLORS.anchorDone : (a.progress > 0 ? COLORS.anchorCharging : COLORS.anchorPending);
        ctx.rotate(a.rotation);
        ctx.beginPath(); ctx.arc(0, 0, a.radius, 0, Math.PI * 2);
        ctx.strokeStyle = mainColor; ctx.lineWidth = 2; ctx.setLineDash([10, 20]); ctx.stroke(); ctx.setLineDash([]);
        if (!a.isComplete && a.progress > 0) {
            ctx.rotate(-a.rotation); ctx.beginPath();
            ctx.arc(0, 0, a.radius + 10, -Math.PI / 2, (Math.PI * 2 * (a.progress / 100)) - Math.PI / 2);
            ctx.strokeStyle = COLORS.anchorCharging; ctx.lineWidth = 4; ctx.stroke();
        }
        ctx.beginPath();
        let pulse = a.isComplete ? Math.sin(gameTime * 3) * 5 : 0;
        ctx.arc(0, 0, a.radius - 5 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = a.isComplete ? 'rgba(44, 182, 125, 0.2)' : 'rgba(61, 169, 252, 0.1)';
        ctx.fill(); ctx.restore();

        ctx.fillStyle = mainColor; ctx.font = "100 14px 'Helvetica Neue', sans-serif"; ctx.textAlign = "center";
        if (a.isComplete) { ctx.fillText("ONLINE", a.x, a.y + 5); ctx.font = "100 20px 'Helvetica Neue', sans-serif"; ctx.fillText("✓", a.x, a.y - 15); }
        else if (a.progress > 0) { ctx.fillText(`${Math.floor(a.progress)}%`, a.x, a.y + 5); ctx.font = "100 10px 'Helvetica Neue', sans-serif"; ctx.fillText("SYNCING...", a.x, a.y - 15); }
        else ctx.fillText(a.text, a.x, a.y + 5);
    });

    colleagues.forEach(c => {
        ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
        if (c.isInfected) {
            ctx.fillStyle = COLORS.colleagueInfected; ctx.shadowColor = COLORS.colleagueInfected; ctx.shadowBlur = 10;
            c.x += (Math.random() - 0.5) * 2; c.y += (Math.random() - 0.5) * 2;
        } else { ctx.fillStyle = COLORS.colleagueNeutral; ctx.shadowBlur = 0; }
        ctx.fill();
    });

    shockwaves.forEach(sw => {
        ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke();
    });

    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    particles.forEach(p => {
        ctx.globalAlpha = p.life;

        if (p.type === 'heart') {
            drawHeart(ctx, p.x, p.y - p.size / 2, p.size, p.color);
        } else if (p.type === 'rainbow') {
            drawRainbow(ctx, p.x, p.y, p.size);
        } else {
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
        }
    });
    ctx.globalAlpha = 1.0;

    let stressScaleMultiplier = 1 + (confusion / 120) * 1.3;
    rumors.forEach(r => {
        let pulse = Math.sin(gameTime * 2 + r.pulseOffset);
        let finalScale = (1 + pulse * 0.1) * stressScaleMultiplier;
        let collisionRadius = (r.size * 2.0) * finalScale; // EXACT match to collision logic
        let auraRadius = collisionRadius;

        let gradient = ctx.createRadialGradient(r.x, r.y, 10, r.x, r.y, auraRadius);
        gradient.addColorStop(0, COLORS.rumorDark);
        gradient.addColorStop(0.8, 'rgba(42, 10, 18, 0.9)');
        gradient.addColorStop(1, 'rgba(42, 10, 18, 0)');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(r.x, r.y, auraRadius, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = 'rgba(239, 69, 101, 0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(r.x, r.y, collisionRadius, 0, Math.PI * 2); ctx.stroke();

        ctx.font = "100 20px 'Helvetica Neue', sans-serif"; ctx.textAlign = "center";
        let rX = r.x + (Math.random() - 0.5) * (confusion > 50 ? 4 : 1);
        let rY = r.y + (Math.random() - 0.5) * (confusion > 50 ? 4 : 1);
        if (Math.random() > 0.8) { ctx.fillStyle = COLORS.rumorGlitch; ctx.fillText(r.text, rX + 2, rY); }
        ctx.fillStyle = COLORS.rumorCore; ctx.fillText(r.text, rX, rY);
    });

    player.trail.forEach(t => { ctx.fillStyle = `rgba(255, 255, 255, ${t.alpha * 0.2})`; ctx.fillRect(t.x - player.size / 2, t.y - player.size / 2, player.size, player.size); });
    ctx.fillStyle = COLORS.player; ctx.shadowBlur = 20; ctx.shadowColor = "#3da9fc";
    ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size); ctx.shadowBlur = 0;

    if (gameActive) requestAnimationFrame(loop);
}

function spawnHealingParticles(x, y) {
    for (let i = 0; i < 12; i++) {
        let type = Math.random() > 0.5 ? 'heart' : 'rainbow';
        particles.push({
            x: x + (Math.random() - 0.5) * 40,
            y: y + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 1,
            vy: -1 - Math.random() * 2,
            life: 1.0,
            decay: 0.01,
            size: 10 + Math.random() * 10,
            type: type,
            color: `hsl(${330 + Math.random() * 30}, 100%, 70%)`
        });
    }
}

function drawHeart(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
    ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.fill();
}

function drawRainbow(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    const colors = ['#FF9AA2', '#FFDAC1', '#B5EAD7'];
    const bandWidth = size / 4;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, size - (i * bandWidth), Math.PI, 0);
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = bandWidth;
        ctx.stroke();
    }
    ctx.restore();
}

function loop(timestamp) {
    if (isPaused) return;

    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Normalize to 60 FPS (1/60 = 0.01666...)
    // If running at 60 FPS, dt will be ~1.
    // If running at 120 FPS, dt will be ~0.5.
    const dt = deltaTime * 60;

    update(dt);
    draw();
}

function resolveCollisions(dt) {
    // Rumor vs Rumor
    for (let i = 0; i < rumors.length; i++) {
        for (let j = i + 1; j < rumors.length; j++) {
            let r1 = rumors[i]; let r2 = rumors[j];
            let dx = r2.x - r1.x; let dy = r2.y - r1.y;
            let dist = Math.hypot(dx, dy);
            // Visual/Collision radius is size * 2.0
            // We use a slightly smaller physics radius to allow some overlap before bounce
            let r1Rad = r1.size * 2.0;
            let r2Rad = r2.size * 2.0;
            let minDist = r1Rad + r2Rad;

            if (dist < minDist) {
                let angle = Math.atan2(dy, dx);
                let overlap = minDist - dist;

                // Separate
                let moveX = Math.cos(angle) * overlap * 0.5;
                let moveY = Math.sin(angle) * overlap * 0.5;
                r1.x -= moveX; r1.y -= moveY;
                r2.x += moveX; r2.y += moveY;

                // Elastic Bounce
                let nx = Math.cos(angle); let ny = Math.sin(angle);
                let p = 2 * (r1.vx * nx + r1.vy * ny - r2.vx * nx - r2.vy * ny) / (r1.size + r2.size);
                r1.vx -= p * r2.size * nx; r1.vy -= p * r2.size * ny;
                r2.vx += p * r1.size * nx; r2.vy += p * r1.size * ny;
            }
        }
    }

    // Rumor vs Anchor
    rumors.forEach(r => {
        let rRad = r.size * 2.0;
        anchors.forEach(a => {
            let dx = r.x - a.x; let dy = r.y - a.y;
            let dist = Math.hypot(dx, dy);
            let minDist = rRad + a.radius;

            if (dist < minDist) {
                let angle = Math.atan2(dy, dx);
                let overlap = minDist - dist;

                // Push Rumor out (Anchor is static/heavy)
                r.x += Math.cos(angle) * overlap;
                r.y += Math.sin(angle) * overlap;

                // Reflect Velocity
                let nx = Math.cos(angle); let ny = Math.sin(angle);
                let dot = r.vx * nx + r.vy * ny;
                r.vx = r.vx - 2 * dot * nx;
                r.vy = r.vy - 2 * dot * ny;
            }
        });
    });
}
