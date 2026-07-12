// ═══════════════════════════════════════════════════════════
// MODEL KOMBAT — app.js (Part 1/2)
// ═══════════════════════════════════════════════════════════

// --- DATA: FIGHTERS & LADDER ---
const VENDORS = {
    GOOGLE: '#4285F4',
    OPENAI: '#10A37F',
    ANTHROPIC: '#D97706',
    META: '#0467DF',
    MISTRAL: '#FF7000',
    DEEPSEEK: '#1E40AF'
};

const FIGHTERS_DB = {
    'gemma-2b': { id: 'gemma-2b', name: 'Gemma 2B', vendor: 'Google', color: VENDORS.GOOGLE, tier: 1, hasMoE: true, moeName: 'Gemma E2B', moeThreshold: 80, hp: 100, dmg: 5, spd: 5, def: 5, desc: 'A lightweight Google model utilizing Context Window buffs and Modality Shift stances.' },
    'gpt-3.5': { id: 'gpt-3.5', name: 'GPT-3.5', vendor: 'OpenAI', color: VENDORS.OPENAI, tier: 1, hasMoE: false, hp: 110, dmg: 6, spd: 5, def: 6, desc: 'OpenAI legacy brawler. Gathers RLHF Reward stacks and safety alignment buffers.' },
    'llama-3-3b': { id: 'llama-3-3b', name: 'Llama 3.2 3B', vendor: 'Meta', color: VENDORS.META, tier: 1, hasMoE: false, hp: 100, dmg: 7, spd: 7, def: 4, desc: 'Meta edge weight model. Accumulates Open-Weights Adaptation stacks to mitigate damage.' },
    'mistral-7b': { id: 'mistral-7b', name: 'Mistral 7B', vendor: 'Mistral', color: VENDORS.MISTRAL, tier: 2, hasMoE: false, hp: 120, dmg: 7, spd: 6, def: 5, desc: 'Agile open-weight prodigy with Sliding Window Attention block shields and GQA charging speed.' },
    'gemma-4b': { id: 'gemma-4b', name: 'Gemma 4B', vendor: 'Google', color: VENDORS.GOOGLE, tier: 2, hasMoE: true, moeName: 'Gemma E4B', moeThreshold: 75, hp: 110, dmg: 7, spd: 6, def: 6, desc: 'Google on-device model. Cycles text, vision, and audio modalities to surprise enemies.' },
    'claude-haiku': { id: 'claude-haiku', name: 'Claude Haiku', vendor: 'Anthropic', color: VENDORS.ANTHROPIC, tier: 2, hasMoE: true, moeName: 'Haiku Thinking', moeThreshold: 70, hp: 130, dmg: 6, spd: 8, def: 7, desc: 'Anthropic lightweight model. Employs Constitutional Guard perfect blocks and grab dampeners.' },
    'llama-3-8b': { id: 'llama-3-8b', name: 'Llama 3.1 8B', vendor: 'Meta', color: VENDORS.META, tier: 2, hasMoE: false, hp: 130, dmg: 8, spd: 7, def: 5, desc: 'Robust Meta brawler. Fine-tunes resistance to enemy punches/kicks in real-time.' },
    'gpt-4o-mini': { id: 'gpt-4o-mini', name: 'GPT-4o mini', vendor: 'OpenAI', color: VENDORS.OPENAI, tier: 3, hasMoE: true, moeName: '4o mini MoE', moeThreshold: 65, hp: 150, dmg: 8, spd: 8, def: 7, desc: 'Cost-effective OpenAI model utilizing Chain-of-Thought (CoT) reasoning steps and auto-dodge.' },
    'gemini-flash': { id: 'gemini-flash', name: 'Gemini Flash', vendor: 'Google', color: VENDORS.GOOGLE, tier: 3, hasMoE: true, moeName: 'Flash Thinking', moeThreshold: 60, hp: 140, dmg: 9, spd: 9, def: 6, desc: 'Lightning-fast Google model. Context tokens boost damage; Audio Modality compresses recovery frames.' },
    'mixtral-8x7b': { id: 'mixtral-8x7b', name: 'Mixtral 8x7B ⚡', vendor: 'Mistral', color: VENDORS.MISTRAL, tier: 3, hasMoE: true, isNativeMoE: true, moeName: 'Mixtral (Active)', moeThreshold: 30, hp: 160, dmg: 8, spd: 7, def: 6, desc: 'Native Mixture of Experts. Dynamically routes code, math, and vision experts to switch buffs.' },
    'llama-4-scout': { id: 'llama-4-scout', name: 'Llama 4 Scout ⚡', vendor: 'Meta', color: VENDORS.META, tier: 4, hasMoE: true, isNativeMoE: true, moeName: 'Scout (Active)', moeThreshold: 25, hp: 170, dmg: 9, spd: 8, def: 6, desc: 'Pretrained scout model. Scales from 8B up to 70B and 405B to gain size and Super Armor.' },
    'deepseek-v2': { id: 'deepseek-v2', name: 'DeepSeek V2 ⚡', vendor: 'DeepSeek', color: VENDORS.DEEPSEEK, tier: 4, hasMoE: true, isNativeMoE: true, moeName: 'V2 (Active)', moeThreshold: 35, hp: 180, dmg: 10, spd: 6, def: 7, desc: 'Super-efficient MLA compression. Alternates Combust, Contain, and Shared expert nodes.' },
    'claude-sonnet': { id: 'claude-sonnet', name: 'Claude Sonnet', vendor: 'Anthropic', color: VENDORS.ANTHROPIC, tier: 4, hasMoE: true, moeName: 'Sonnet Thinking', moeThreshold: 65, hp: 200, dmg: 9, spd: 8, def: 10, desc: 'Highly aligned Anthropic model. Caps single-hit damage to 15% HP and unleashes Prompt blades.' },
    'gemini-2-5-pro': { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', vendor: 'Google', color: VENDORS.GOOGLE, tier: 4, hasMoE: true, moeName: '2.5 Pro MoE', moeThreshold: 60, hp: 220, dmg: 11, spd: 8, def: 8, desc: 'Frontier Google model. Vision modality unlocks massive melee hitboxes and thick laser beams.' },
    'gpt-4o': { id: 'gpt-4o', name: 'GPT-4o', vendor: 'OpenAI', color: VENDORS.OPENAI, tier: 4, hasMoE: true, moeName: 'GPT-4o MoE', moeThreshold: 70, hp: 230, dmg: 10, spd: 9, def: 9, desc: 'Omni-modal OpenAI titan. Performs Perfect Guards on close blocks and teleports away using CoT.' },
    'llama-4-maverick': { id: 'llama-4-maverick', name: 'Llama 4 Maverick ⚡', vendor: 'Meta', color: VENDORS.META, tier: 4, hasMoE: true, isNativeMoE: true, moeName: 'Maverick (Active)', moeThreshold: 20, hp: 240, dmg: 12, spd: 10, def: 7, desc: 'Brutal open weight giant. Spits Hallucination poison and launches Llama stampedes.' },
    'deepseek-v3': { id: 'deepseek-v3', name: 'DeepSeek V3 ⚡', vendor: 'DeepSeek', color: VENDORS.DEEPSEEK, tier: 4, hasMoE: true, isNativeMoE: true, moeName: 'V3 (Active)', moeThreshold: 25, hp: 250, dmg: 13, spd: 8, def: 9, desc: 'Apex DeepSeek model. Triggers Multi-Token Prediction double hits and half-decay MoE timers.' },
    'claude-opus': { id: 'claude-opus', name: 'Claude Opus', vendor: 'Anthropic', color: VENDORS.ANTHROPIC, tier: 5, hasMoE: true, moeName: 'Opus Thinking', moeThreshold: 75, hp: 300, dmg: 12, spd: 7, def: 12, desc: 'Anthropic apex fighter. Constitutional shielding ignores chip damage and censors heavy hits.' },
    'gemini-ultra': { id: 'gemini-ultra', name: 'Gemini Ultra', vendor: 'Google', color: VENDORS.GOOGLE, tier: 5, hasMoE: true, moeName: 'Ultra MoE', moeThreshold: 80, hp: 320, dmg: 14, spd: 8, def: 10, desc: 'Largest Google model. Builds 1M Context tokens and splits audio lasers into sinewaves.' },
    'o3': { id: 'o3', name: 'o3', vendor: 'OpenAI', color: VENDORS.OPENAI, tier: 5, hasMoE: true, moeName: 'Reasoning Storm', moeThreshold: 85, hp: 350, dmg: 15, spd: 10, def: 11, desc: 'OpenAI reasoning specialist. Charges CoT to launch unblockable bounding boxes and binary spread shots.' }
};


const LADDER = [
    'gemma-2b', 'gpt-3.5', 'llama-3-3b', 'mistral-7b', 'gemma-4b',
    'claude-haiku', 'llama-3-8b', 'gpt-4o-mini', 'gemini-flash', 'mixtral-8x7b',
    'llama-4-scout', 'deepseek-v2', 'claude-sonnet', 'gemini-2-5-pro', 'gpt-4o',
    'llama-4-maverick', 'deepseek-v3', 'claude-opus', 'gemini-ultra', 'o3'
];

// --- STATE ---
let gameState = {
    screen: 'title', // title, select, ladder, fight, result, champion
    playerFighterId: null,
    ladderProgress: parseInt(localStorage.getItem('modelKombatLadder')) || 0,
    currentOpponentIdx: 0,
    audioContext: null
};

// --- AUDIO SYNTHESIS ---
const Audio = {
    init() {
        // Handled automatically by AIEngine
    },
    playTone(freq, type, duration, vol=0.1) {
        AIEngine.Audio.playTone({ freq, type, duration, volume: vol });
    },
    hit() { 
        AIEngine.Audio.playFightSound('punch');
    },
    heavyHit() {
        AIEngine.Audio.playFightSound('heavy_hit');
    },
    block() { 
        AIEngine.Audio.playFightSound('block');
    },
    charge() { 
        AIEngine.Audio.playTone({ freq: 140 + Math.sin(Date.now() * 0.01) * 30, type: 'sawtooth', duration: 0.15, volume: 0.05 });
    },
    moe() { 
        AIEngine.Audio.playTone({ freq: 400, type: 'square', duration: 0.1, volume: 0.2 });
        setTimeout(() => AIEngine.Audio.playTone({ freq: 600, type: 'square', duration: 0.3, volume: 0.2 }), 100); 
    },
    super() { 
        AIEngine.Audio.playTone({ freq: 200, type: 'sawtooth', duration: 0.2, volume: 0.3 });
        setTimeout(() => AIEngine.Audio.playTone({ freq: 100, type: 'sawtooth', duration: 0.5, volume: 0.4 }), 200); 
    },
    ko() { 
        AIEngine.Audio.playTone({ freq: 90, type: 'sine', duration: 1.0, volume: 0.5 });
    },
    fatalityChime() {
        AIEngine.Audio.playFightSound('announcer_round');
    }
};

// --- DOM ELEMENTS ---
const screens = {
    title: document.getElementById('screen-title'),
    select: document.getElementById('screen-select'),
    ladder: document.getElementById('screen-ladder'),
    fight: document.getElementById('screen-fight'),
    champion: document.getElementById('screen-champion')
};

// --- NAVIGATION ---
function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenId].classList.add('active');
    gameState.screen = screenId;
    Audio.init();
    
    if (screenId === 'select') renderSelectScreen();
    if (screenId === 'ladder') renderLadderScreen();
    if (screenId === 'fight') initFight();
}

// Title screen bindings
document.addEventListener('keydown', (e) => {
    if (gameState.screen === 'title' && e.key === 'Enter') showScreen('select');
});
screens.title.addEventListener('click', () => { if (gameState.screen === 'title') showScreen('select'); });
document.getElementById('btn-select-back').addEventListener('click', () => showScreen('title'));
document.getElementById('btn-ladder-back').addEventListener('click', () => showScreen('select'));
document.getElementById('btn-result-continue').addEventListener('click', () => {
    document.getElementById('result-modal').classList.add('hidden');
    if (gameState.ladderProgress >= LADDER.length) {
        showScreen('champion');
    } else {
        showScreen('ladder');
    }
});
document.getElementById('btn-result-menu').addEventListener('click', () => {
    document.getElementById('result-modal').classList.add('hidden');
    showScreen('select');
});
document.getElementById('btn-champion-restart').addEventListener('click', () => {
    localStorage.setItem('modelKombatLadder', 0);
    gameState.ladderProgress = 0;
    showScreen('select');
});
document.getElementById('btn-ladder-reset').addEventListener('click', () => {
    if (confirm("Reset your ladder progress back to Rung 1? This cannot be undone.")) {
        localStorage.setItem('modelKombatLadder', 0);
        gameState.ladderProgress = 0;
        showScreen('select');
    }
});

// --- SELECT SCREEN LOGIC ---
let selectedPreviewId = null;
function renderSelectScreen() {
    const grid = document.getElementById('fighter-grid');
    grid.innerHTML = '';
    
    LADDER.forEach((id, idx) => {
        const fighter = FIGHTERS_DB[id];
        const isLocked = idx > gameState.ladderProgress && idx !== 0; // First is always unlocked? No, let player pick ANY unlocked they beat + 1. Actually, fighting games let you pick anyone to fight the ladder. Wait, the prompt says "progressively beat models to reach champion". Usually you pick your main. Let's let them pick any unlocked model. For now, let's unlock all for player to pick, ladder is just the opponents. 
        // Update: Let's let player pick ANY fighter they want for replayability, but highlight their tier.
        
        const el = document.createElement('div');
        el.className = 'fighter-card';
        if (fighter.isNativeMoE) el.innerHTML += `<div class="native-moe-badge">MoE</div>`;
        
        el.innerHTML += `
            <canvas class="fighter-card-canvas" id="thumb-${id}" width="90" height="108"></canvas>
            <div class="fighter-card-info">
                <div class="fighter-card-name" style="color: ${fighter.color}">${fighter.name}</div>
                <div class="fighter-card-vendor">${fighter.vendor} - Tier ${fighter.tier}</div>
            </div>
        `;
        
        el.addEventListener('click', () => {
            document.querySelectorAll('.fighter-card').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            selectedPreviewId = id;
            updatePreview();
        });
        grid.appendChild(el);
        
        // Draw thumbnail
        setTimeout(() => drawThumbnail(document.getElementById(`thumb-${id}`), fighter), 0);
    });
    
    // Auto-select first or previously selected
    if (!selectedPreviewId) selectedPreviewId = LADDER[0];
    const firstCard = grid.children[LADDER.indexOf(selectedPreviewId)];
    if(firstCard) firstCard.classList.add('selected');
    updatePreview();
}

function updatePreview() {
    if (!selectedPreviewId) return;
    const f = FIGHTERS_DB[selectedPreviewId];
    document.getElementById('preview-name').textContent = f.name;
    document.getElementById('preview-name').style.color = f.color;
    document.getElementById('preview-vendor').textContent = `${f.vendor} | Tier ${f.tier}`;
    
    document.getElementById('preview-stats').innerHTML = `
        <div class="stat-item">HP <span class="stat-bar"><span class="stat-fill" style="width:${(f.hp/350)*100}%"></span></span></div>
        <div class="stat-item">POW <span class="stat-bar"><span class="stat-fill" style="width:${(f.dmg/15)*100}%"></span></span></div>
        <div class="stat-item">SPD <span class="stat-bar"><span class="stat-fill" style="width:${(f.spd/10)*100}%"></span></span></div>
    `;
    
    document.getElementById('preview-moe').textContent = f.hasMoE ? `Evolution: ${f.moeName} (Charge ${f.moeThreshold}%)` : `Super Move: Full Charge`;
    document.getElementById('preview-desc').textContent = f.desc || '';
    document.getElementById('btn-select-fight').disabled = false;
    
    drawThumbnail(document.getElementById('preview-canvas'), f, true);
}

document.getElementById('btn-select-fight').addEventListener('click', () => {
    gameState.playerFighterId = selectedPreviewId;
    showScreen('ladder');
});

// --- LADDER SCREEN LOGIC ---
function renderLadderScreen() {
    const track = document.getElementById('ladder-track');
    track.innerHTML = '';
    
    gameState.currentOpponentIdx = Math.min(gameState.ladderProgress, LADDER.length - 1);
    document.getElementById('ladder-player-label').textContent = `FIGHTER: ${FIGHTERS_DB[gameState.playerFighterId].name.toUpperCase()}`;
    
    LADDER.forEach((id, idx) => {
        const f = FIGHTERS_DB[id];
        const isBeaten = idx < gameState.ladderProgress;
        const isCurrent = idx === gameState.ladderProgress;
        const isLocked = idx > gameState.ladderProgress;
        
        const el = document.createElement('div');
        el.className = `ladder-rung ${isBeaten ? 'beaten' : ''} ${isCurrent ? 'current' : ''} ${idx === LADDER.length-1 ? 'champion-rung' : ''}`;
        
        let statusHtml = '';
        if (isBeaten) statusHtml = '<div class="rung-status status-beaten">CLEARED</div>';
        else if (isCurrent) statusHtml = '<div class="rung-status status-current">NEXT MATCH →</div>';
        else statusHtml = '<div class="rung-status status-locked">LOCKED</div>';
        
        el.innerHTML = `
            <div class="rung-rank">${idx+1}</div>
            <div class="rung-info">
                <div class="rung-name" style="color: ${f.color}">${f.name}</div>
                <div class="rung-vendor">${f.vendor}</div>
            </div>
            ${statusHtml}
        `;
        
        if (isCurrent) {
            el.addEventListener('click', () => showScreen('fight'));
        }
        
        track.appendChild(el);
    });
    
    // Auto scroll to current
    setTimeout(() => {
        const curr = document.querySelector('.ladder-rung.current');
        if (curr) curr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}
