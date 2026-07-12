// ═══════════════════════════════════════════════════════════
// MODEL KOMBAT — engine.js (IK, 3D Wireframes, Weapons)
// ═══════════════════════════════════════════════════════════

const canvas = document.getElementById('fight-canvas');
const ctx = canvas.getContext('2d');
let GROUND_Y = 200; // computed in initFight from canvas height

let fightState = {
    active: false,
    p1: null,
    p2: null,
    particles: [],
    projectiles: [],
    weapons: [],
    sparks: [],
    smears: [],
    timer: 99,
    round: 1,
    p1Wins: 0,
    p2Wins: 0,
    lastTime: 0,
    shake: 0,
    hitStop: 0,
    slowMoTimer: 0,
    weaponSpawnTimer: Math.random() * 500 + 300
};

// --- INPUT HANDLING ---
const keys = { w: false, a: false, s: false, d: false, ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };

// Bind actions in AIEngine
AIEngine.Input.bindAction('left', ['a', 'ArrowLeft']);
AIEngine.Input.bindAction('right', ['d', 'ArrowRight']);
AIEngine.Input.bindAction('jump', ['w', 'ArrowUp']);
AIEngine.Input.bindAction('crouch', ['s', 'ArrowDown']);
AIEngine.Input.bindAction('punch', ['p']);
AIEngine.Input.bindAction('kick', ['k']);
AIEngine.Input.bindAction('block', ['b']);
AIEngine.Input.bindAction('charge', ['c']);
AIEngine.Input.bindAction('special', ['e', 'f', ' ']);
AIEngine.Input.bindAction('grab', ['q']);
AIEngine.Input.bindAction('ranged', ['r']);

// Hook fatality checks
document.addEventListener('keydown', e => {
    if (!fightState.active) {
        const key = e.key.toLowerCase();
        if ((key === 'e' || key === 'f' || key === ' ') && fightState.p1 && fightState.p2) {
            const opp = fightState.p2;
            if (opp.state === 'dizzy' && Math.abs(fightState.p1.x - opp.x) < 130) {
                fightState.p1.executeFatality(opp);
            }
        }
    }
});

// Mobile button bindings bridged to AIEngine simulation
const bindBtn = (id, key, actionType) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        AIEngine.Input.simulateKey(key, 'keydown');
        btn.classList.add('pressed');
    });
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        AIEngine.Input.simulateKey(key, 'keyup');
        btn.classList.remove('pressed');
    });
    btn.addEventListener('mousedown', (e) => {
        AIEngine.Input.simulateKey(key, 'keydown');
        btn.classList.add('pressed');
    });
    btn.addEventListener('mouseup', (e) => {
        AIEngine.Input.simulateKey(key, 'keyup');
        btn.classList.remove('pressed');
    });
    btn.addEventListener('mouseleave', (e) => {
        AIEngine.Input.simulateKey(key, 'keyup');
        btn.classList.remove('pressed');
    });
};

bindBtn('btn-left', 'ArrowLeft');
bindBtn('btn-right', 'ArrowRight');
bindBtn('btn-up', 'ArrowUp');
bindBtn('btn-punch', 'p', 'punch');
bindBtn('btn-kick', 'k', 'kick');
bindBtn('btn-block', 'b', 'block');
bindBtn('btn-charge', 'c', 'charge');
bindBtn('btn-special', 'e', 'special');
bindBtn('btn-grab', 'q', 'grab');
bindBtn('btn-ranged', 'r', 'ranged');

// --- MATH & UTILS ---
// Inverse Kinematics (Law of Cosines)
function solveIK(sx, sy, tx, ty, l1, l2, flip) {
    const res = AIEngine.Rigging.solve2JointIK({ x: sx, y: sy }, { x: tx, y: ty }, l1, l2, flip);
    return { ex: res.joint.x, ey: res.joint.y, tx: res.target.x, ty: res.target.y };
}

// 3D Projection
function project3D(x, y, z, cx, cy) {
    const res = AIEngine.Renderer3D.projectPoint({ x, y, z }, cx * 2, cy * 2, Math.PI / 3, 400);
    return { x: res.x, y: res.y, scale: res.scale };
}

// --- OBJECTS ---
class Projectile {
    constructor(x, y, dir, dmg, color, tier, type='energy', vendor='Google', isPlayerProj=true, vyOffset=0) {
        this.x = x; this.y = y; this.w = 32; this.h = 16;
        this.vx = dir * (type === 'energy' ? 650 : (type === 'sword' ? 450 : (type === 'beam' ? 1200 : 750)));
        this.vy = vyOffset * 60; // for diverging wind slashes
        if(type === 'weapon') this.vy = -200; // Throw arc
        this.damage = dmg;
        this.color = color;
        this.tier = tier;
        this.type = type; // energy, weapon, beam, box, sword, llama, slash, deepseek_special
        this.vendor = vendor;
        this.isPlayerProj = isPlayerProj;
        this.active = true;
        this.life = type === 'box' ? 40 : (type === 'beam' ? 25 : 90);
        this.startY = y;
        this.animTime = 0;
    }
    update(dt) {
        this.animTime += dt;
        // Acceleration for Anthropic golden prompt swords
        if(this.type === 'sword') {
            this.vx += Math.sign(this.vx) * 800 * dt;
        }
        // Winding sine wave for DeepSeek math chain
        if(this.type === 'deepseek_special') {
            this.y = this.startY + Math.sin(this.animTime * 15) * 45;
        }
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if(this.type === 'weapon') this.vy += 1200 * dt; // gravity
        
        if(this.x < -200 || this.x > 1600 || this.y > GROUND_Y + 120) this.active = false;
        
        // Spawn digital particles for coding theme
        if (Math.random() < 0.4) {
            createParticles(this.x - (Math.sign(this.vx)*12), this.y, this.color, 1, false, this.type === 'box');
        }
    }
    render(ctx) {
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;

        if (this.type === 'weapon') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.x * 0.12);
            ctx.fillStyle = '#bbb'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
            ctx.fillRect(-18, -6, 36, 12);
            ctx.strokeRect(-18, -6, 36, 12);
        }
        else if (this.type === 'beam') {
            // Google Multimodal Beam: horizontal colored laser strips
            const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
            const dirSign = Math.sign(this.vx);
            ctx.globalAlpha = Math.min(1.0, this.life / 10);
            
            let thickness = 6;
            let offsetMult = 7;
            
            if (this.modality === 'VISION') {
                // Thicker high-density beam
                thickness = 10;
                offsetMult = 11;
            } else if (this.modality === 'AUDIO') {
                // Rippling sinusoidal soundwaves
                ctx.save();
                for (let i = 0; i < 4; i++) {
                    ctx.fillStyle = colors[i];
                    ctx.beginPath();
                    const startX = this.x;
                    const endX = this.x + dirSign * 1400;
                    const step = 15;
                    ctx.moveTo(startX, this.y - 14 + i*7);
                    for (let x = startX; dirSign > 0 ? x <= endX : x >= endX; x += dirSign * step) {
                        const waveY = Math.sin((x * 0.05) + (this.animTime * 15)) * 8;
                        ctx.lineTo(x, this.y - 14 + i*7 + waveY);
                    }
                    ctx.strokeStyle = colors[i];
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
                ctx.restore();
                ctx.restore();
                return;
            }
            
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = colors[i];
                ctx.fillRect(this.x, this.y - (offsetMult * 2) + i*offsetMult, dirSign * 1400, thickness);
            }
        }
        else if (this.type === 'box' || this.type === 'box_perfect') {
            // OpenAI Bounding Box: green code window (box or box_perfect)
            const isPerf = this.type === 'box_perfect';
            ctx.strokeStyle = isPerf ? '#00ff66' : '#10A37F';
            ctx.lineWidth = isPerf ? 4.0 : 2.5;
            ctx.strokeRect(this.x - 32, this.y - 65, 64, 110);
            
            ctx.fillStyle = isPerf ? 'rgba(0, 255, 102, 0.22)' : 'rgba(16,163,127,0.12)';
            ctx.fillRect(this.x - 32, this.y - 65, 64, 110);
            
            // Spinning core (spins faster on perfect alignment)
            ctx.save();
            ctx.translate(this.x, this.y - 10);
            ctx.rotate(this.animTime * (isPerf ? 12 : 6));
            ctx.strokeRect(isPerf ? -14 : -10, isPerf ? -14 : -10, isPerf ? 28 : 20, isPerf ? 28 : 20);
            ctx.restore();
        }
        else if (this.type === 'sword') {
            // Anthropic Golden Prompt Sword
            ctx.fillStyle = '#D97706';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.vx > 0 ? 0 : Math.PI);
            ctx.beginPath();
            ctx.moveTo(18, 0); // Tip
            ctx.lineTo(-6, -7);
            ctx.lineTo(-14, -2);
            ctx.lineTo(-14, 2);
            ctx.lineTo(-6, 7);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        }
        else if (this.type === 'llama') {
            // Meta Wireframe Llama
            ctx.strokeStyle = '#0467DF';
            ctx.lineWidth = 2.5;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.vx > 0 ? 0 : Math.PI);
            ctx.beginPath();
            ctx.moveTo(-15, 8);
            ctx.lineTo(-15, -6);
            ctx.lineTo(-8, -20); // neck/head
            ctx.lineTo(-11, -26); // ears
            ctx.lineTo(-7, -26);
            ctx.lineTo(-3, -20);
            ctx.lineTo(8, -20); // snout
            ctx.lineTo(8, -13);
            ctx.lineTo(1, -11);
            ctx.lineTo(-3, 8);
            ctx.closePath();
            ctx.stroke();
            // Joint nodes
            ctx.fillStyle = '#fff';
            [-15,-8,-11,8].forEach((ox, idx)=>{
                ctx.beginPath(); ctx.arc(ox, -6 - idx*4, 3, 0, Math.PI*2); ctx.fill();
            });
        }
        else if (this.type === 'slash') {
            // Mistral Spinning wind-shears
            ctx.strokeStyle = '#FF7000';
            ctx.lineWidth = 3;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.animTime * 12);
            ctx.beginPath();
            ctx.arc(0, 0, 14, -Math.PI/3, Math.PI/3);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 14, Math.PI - Math.PI/3, Math.PI + Math.PI/3);
            ctx.stroke();
        }
        else if (this.type === 'deepseek_special') {
            // DeepSeek Winding chain of math nodes
            ctx.fillStyle = '#1E40AF';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            const dir = Math.sign(this.vx);
            
            // Draw connecting lines
            ctx.beginPath();
            for(let i=0; i<4; i++) {
                const px = -i * dir * 20;
                const py = Math.sin(this.animTime * 8 - i) * 15;
                if (i === 0) ctx.moveTo(this.x + px, this.y + py);
                else ctx.lineTo(this.x + px, this.y + py);
            }
            ctx.stroke();
            
            // Draw nodes and mathematical symbols inside them
            const symbols = ['Σ', 'λ', '√', 'π'];
            for(let i=0; i<4; i++) {
                const px = -i * dir * 20;
                const py = Math.sin(this.animTime * 8 - i) * 15;
                const size = 9 - i * 1.5;
                
                ctx.beginPath();
                ctx.arc(this.x + px, this.y + py, size, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.round(size * 1.2)}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(symbols[i], this.x + px, this.y + py);
                ctx.restore();
            }
        }
        else {
            // Standard Fireball (Hadouken-like energy orb)
            const t = this.animTime * 15;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            
            // Vision modality has a larger fireball radius
            const radius = this.modality === 'VISION' ? 16 : 11;
            ctx.arc(this.x, this.y, radius, 0, Math.PI*2);
            ctx.fill();
            
            // Plasma tail (longer trail in Audio mode)
            const dir = Math.sign(this.vx);
            const tailCount = this.modality === 'AUDIO' ? 6 : 4;
            for(let i=0; i<tailCount; i++) {
                ctx.fillStyle = this.color + 'aa';
                ctx.beginPath();
                ctx.arc(this.x - dir * (8 + i*6) + Math.sin(t+i)*3, this.y + Math.cos(t+i)*3, Math.max(0.1, radius - 3 - i*2), 0, Math.PI*2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

class Weapon {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.vy = 0;
        this.type = type;
        this.durability = 3;
        this.active = true;
    }
    update(dt) {
        if(this.y < GROUND_Y) {
            this.vy += 1200 * dt;
            this.y += this.vy * dt;
            if(this.y > GROUND_Y) { this.y = GROUND_Y; this.vy = 0; }
        }
    }
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y - 10);
        const glow = (color) => { ctx.shadowBlur=12; ctx.shadowColor=color; };
        if(this.type === 'Keyboard') {
            // Main body
            ctx.fillStyle='#1a1a2e'; ctx.strokeStyle='#00f0ff'; ctx.lineWidth=1.5;
            glow('#00f0ff');
            ctx.beginPath(); ctx.roundRect(-22,-8,44,16,3); ctx.fill(); ctx.stroke();
            // Key rows
            ctx.fillStyle='#00f0ff'; ctx.shadowBlur=0;
            for(let r=0;r<2;r++) for(let c=0;c<6;c++) {
                ctx.fillRect(-18+c*7, -5+r*7, 5, 5);
            }
        }
        if(this.type === 'Banhammer') {
            ctx.strokeStyle='#ff4040'; ctx.lineWidth=2; glow('#ff4040');
            // Handle
            ctx.fillStyle='#8B4513';
            ctx.beginPath(); ctx.roundRect(-3,-28,6,28,2); ctx.fill(); ctx.stroke();
            // Head
            ctx.fillStyle='#cc2020';
            ctx.beginPath(); ctx.roundRect(-14,-36,28,14,3); ctx.fill(); ctx.stroke();
            // Highlight
            ctx.fillStyle='rgba(255,100,100,0.4)';
            ctx.fillRect(-12,-35,10,5);
        }
        if(this.type === 'Server') {
            ctx.fillStyle='#0a0a1a'; ctx.strokeStyle='#4080ff'; ctx.lineWidth=1.5;
            glow('#4080ff');
            ctx.beginPath(); ctx.roundRect(-14,-42,28,42,2); ctx.fill(); ctx.stroke();
            // Rack unit lines and LEDs
            for(let i=0;i<4;i++) {
                ctx.fillStyle='rgba(64,128,255,0.2)';
                ctx.fillRect(-12,-38+i*10,24,8);
                ctx.fillStyle = i%2===0?'#00ff88':'#ff4040';
                ctx.beginPath(); ctx.arc(10,-34+i*10,2,0,Math.PI*2); ctx.fill();
            }
        }
        
        // Floating pickup label when on ground
        if (Math.round(this.y) >= GROUND_Y) {
            ctx.save();
            ctx.shadowBlur = 0; // Clear glowing shadow to keep text sharp
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            
            const bounce = Math.sin(Date.now() * 0.007) * 3;
            ctx.fillText(`PRESS [Q] TO PICK UP ${this.type.toUpperCase()}`, 0, -52 + bounce);
            
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.moveTo(-4, -45 + bounce);
            ctx.lineTo(4, -45 + bounce);
            ctx.lineTo(0, -40 + bounce);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        
        ctx.restore();
    }
}

// --- FIGHTER CLASS ---
class Fighter {
    constructor(dbData, isPlayer) {
        this.data = dbData;
        this.isPlayer = isPlayer;
        this.tier = dbData.tier;
        this.color = dbData.color;
        
        // Stats
        this.maxHp = dbData.hp;
        this.hp = this.maxHp;
        this.maxKi = 100;
        this.ki = dbData.isNativeMoE ? 20 : 0;
        this.dmgBase = dbData.dmg;
        this.spdBase = dbData.spd;
        this.defBase = dbData.def;
        
        // State
        this.x = isPlayer ? 150 : 650;
        this.y = GROUND_Y;
        this.w = 50;
        this.h = 100;
        this.vx = 0;
        this.vy = 0;
        this.gravity = 1200;
        this.jumpPower = -500;
        this.dir = isPlayer ? 1 : -1;
        this.state = 'idle'; 
        this.stateTimer = 0;
        this.stateTimerMax = 0;
        this.animTime = 0;
        
        this.isMoE = false;
        this.combo = 0;
        this.hitbox = null; 
        this.weapon = null; // Holds a Weapon object
        this.aiAttackCooldown = 0;
        this.aiCrouching = false;
        this.attackConnected = false;
        this.attackCooldown = 0;
        
        // DBZ Overcharge and Limit Break traits
        this.overchargeLevel = 0;
        this.isLimitBroken = false;
        this.limitBreakTimer = 0;
        this.hitFlashTimer = 0;
        this.wasVaporized = false;

        // --- CUSTOM VENDOR TRAIT INITIALIZATIONS ---
        const vend = this.data && this.data.vendor ? this.data.vendor.toLowerCase() : '';
        
        // Universal combat timers applicable to any fighter
        this.hallucinationTime = 0; 
        
        if (vend === 'google') {
            this.contextTokens = 0;
            this.maxContextTokens = 1048576; // 1.05M Context Window
            this.activeModality = 'TEXT';
            this.modalityTimer = 0;
        } else if (vend === 'openai') {
            this.rlhfStacks = 0;
            this.safetyTimer = 0;
            this.cotTokens = 0;
            this.cotChargeProgress = 0;
            this.perfectGuardActive = false;
        } else if (vend === 'meta') {
            this.metaFineTune = { punch: 0, kick: 0, projectile: 0 };
            this.metaFineTuneTimer = { punch: 0, kick: 0, projectile: 0 };
            this.metaParameters = 0; // 0 to 100
            this.metaCurrentSize = '8B'; // 8B, 70B, 405B
        } else if (vend === 'mistral') {
            this.activeExperts = [];
            this.expertTimer = 0;
            this.isFineTuned = false;
        } else if (vend === 'deepseek') {
            this.reasoningTokens = 0;
            this.currentExpert = 'shared';
            this.cotParticleTimer = 0;
            this.mtpTimer = 0;
        }
    }

    get dmg() {
        let base = this.dmgBase * (this.isMoE ? 1.35 : 1) * (this.isPlayer ? 1 : 1 + (gameState.currentOpponentIdx*0.05));
        const vend = this.data && this.data.vendor ? this.data.vendor.toLowerCase() : '';
        
        if (vend === 'google') {
            // Context Window Damage Boost (up to +25%)
            const contextPct = this.contextTokens / this.maxContextTokens;
            base *= (1.0 + contextPct * 0.25);
            // Vision Mode deals +15% damage
            if (this.activeModality === 'VISION') base *= 1.15;
        } else if (vend === 'openai') {
            // RLHF Damage Stacks (+6% per stack up to +30%)
            base *= (1.0 + (this.rlhfStacks || 0) * 0.06);
        } else if (vend === 'meta') {
            // Parameter Weight Scaling Damage Modifiers
            if (this.metaCurrentSize === '8B') base *= 0.85;
            if (this.metaCurrentSize === '405B') base *= 1.30;
        } else if (vend === 'mistral') {
            // Open-Source Fine-Tuning Buff (+20% dmg below 35% HP)
            if (this.hp < this.maxHp * 0.35) base *= 1.2;
            // Mixtral Math Expert Buff (+30% dmg)
            if (this.isMoE && this.activeExperts && this.activeExperts.some(e => e.includes("Dmg"))) {
                base *= 1.3;
            }
        } else if (vend === 'deepseek') {
            // DeepSeek Routed-Combust Expert (+25% combo damage when opponent in hitstun)
            if (this.currentExpert === 'combust') base *= 1.25;
        }
        return base;
    }

    get spd() {
        let base = this.spdBase * (this.isMoE ? 1.4 : 1);
        const vend = this.data && this.data.vendor ? this.data.vendor.toLowerCase() : '';
        
        if (vend === 'google') {
            // Context Window Speed Boost (up to +20%)
            const contextPct = this.contextTokens / this.maxContextTokens;
            base *= (1.0 + contextPct * 0.20);
            // Audio Mode provides +25% speed
            if (this.activeModality === 'AUDIO') base *= 1.25;
        } else if (vend === 'meta') {
            // Parameter Weight Scaling Speed Modifiers
            if (this.metaCurrentSize === '8B') base *= 1.20;
            if (this.metaCurrentSize === '405B') base *= 0.80;
        } else if (vend === 'mistral') {
            // Open-Source Fine-Tuning Buff (+25% spd below 35% HP)
            if (this.hp < this.maxHp * 0.35) base *= 1.25;
            // Mixtral Code Expert Buff (+30% speed)
            if (this.isMoE && this.activeExperts && this.activeExperts.some(e => e.includes("Spd"))) {
                base *= 1.3;
            }
        } else if (vend === 'deepseek') {
            // DeepSeek Routed-Shared Expert (+15% walk speed in neutral state)
            if (this.currentExpert === 'shared') base *= 1.15;
        }
        return base;
    }

    dash(dir) {
        if(['ko', 'moe_transform', 'hit', 'grabbed', 'throwing', 'attack', 'land', 'block', 'charge'].includes(this.state)) return;
        if(this.y < GROUND_Y) return; // only on ground
        
        this.state = 'attack';
        this.currentMove = 'dash';
        this.stateTimer = 14;
        this.stateTimerMax = 14;
        this.vx = dir * this.spd * 90; // dash speed lunge!
        if (this.isPlayer) Audio.hit(); // soft whoosh sound
        createParticles(this.x, this.y - 30, '#ffffff', 8);
        
        // Google: Cycle modality on Dash
        if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'google') {
            this.cycleModality();
        }
    }

    executeFatality(victim) {
        if (fightState.fatalityActive) return;
        
        fightState.active = false; // Stop match timer
        fightState.fatalityActive = true;
        fightState.fatalityTimer = 240; // 4 seconds
        
        // Clear all active projectiles and dropped weapons to prevent interference
        fightState.projectiles = [];
        fightState.weapons = [];
        
        this.state = 'fatality_active';
        this.stateTimer = 240;
        this.stateTimerMax = 240;
        this.fatalityHitTriggered = false; // Initialize trigger flag
        
        victim.state = 'fatality_victim';
        victim.stateTimer = 240;
        victim.stateTimerMax = 240;
        
        this.vx = 0; this.vy = 0;
        victim.vx = 0; victim.vy = 0;
        
        Audio.fatalityChime();
        showAnnouncement("FINISH THEM!");
    }

    cycleModality() {
        if (['ko', 'moe_transform', 'hit'].includes(this.state)) return;
        
        const modes = ['TEXT', 'VISION', 'AUDIO'];
        const currentIdx = modes.indexOf(this.activeModality);
        this.activeModality = modes[(currentIdx + 1) % modes.length];
        
        // Dynamically update colors and spawn bursts
        const colors = { TEXT: '#4285F4', VISION: '#34A853', AUDIO: '#EA4335' };
        this.color = colors[this.activeModality];
        createParticles(this.x, this.y - 60, this.color, 15, true, true);
        
        if (this.isPlayer) {
            const freq = this.activeModality === 'TEXT' ? 523.25 : (this.activeModality === 'VISION' ? 587.33 : 659.25); // C5, D5, E5
            Audio.playTone(freq, 'sine', 0.12, 0.1);
        }
    }

    action(type, isStart = true) {
        if(['ko', 'moe_transform', 'hit', 'grabbed', 'throwing'].includes(this.state)) return;
        
        // Attack Cooldown Check (prevents mindless attack button spamming)
        if (isStart && ['punch', 'kick', 'special', 'ranged', 'grab'].includes(type)) {
            if (this.attackCooldown > 0) return;
        }
        
        // --- DIZZY FINISHER TRIGGER ---
        const opp = this.isPlayer ? fightState.p2 : fightState.p1;
        if (opp && opp.state === 'dizzy' && isStart && (type === 'special' || type === 'punch' || type === 'kick')) {
            const dist = Math.abs(this.x - opp.x);
            if (dist < 130) {
                this.executeFatality(opp);
                return;
            }
        }
        
        // --- META (LLAMA) PARAMETER ACCRUAL ---
        if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'meta' && isStart) {
            if (['punch', 'kick', 'ranged'].includes(type)) {
                this.metaParameters = Math.min(100, this.metaParameters + 6);
            } else if (type === 'special') {
                this.metaParameters = Math.min(100, this.metaParameters + 15);
            }
        }
        
        if(type === 'block') {
            if(isStart && (this.state === 'idle' || this.state === 'walk')) this.state = 'block';
            else if(!isStart && this.state === 'block') this.state = 'idle';
        }
        else if(type === 'charge') {
            if(isStart && (this.state === 'idle' || this.state === 'walk')) {
                this.state = 'charge';
                if(this.isPlayer) Audio.charge();
                
                // Google: Cycle modality on Charge start
                if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'google') {
                    this.cycleModality();
                }
            }
            else if(!isStart && this.state === 'charge') {
                this.state = 'idle';
                if (this.overchargeLevel && this.overchargeLevel >= 0.8) {
                    this.isLimitBroken = true;
                    this.limitBreakTimer = 6.0; // Lasts 6 seconds
                    createParticles(this.x, this.y - 60, '#FFD700', 25, true);
                    Audio.playTone(600, 'square', 0.4, 0.25);
                    if (typeof showAnnouncement !== 'undefined') showAnnouncement("LIMIT BREAK!");
                }
                this.overchargeLevel = 0;
            }
        }
        else if(['punch', 'kick', 'special', 'grab', 'ranged'].includes(type)) {
            // --- COMBO CANCELS & CHAINING ---
            if (this.state === 'attack' && isStart) {
                const currentIsNormal = this.currentMove.includes('punch') || this.currentMove.includes('kick');
                const nextIsNormal = type === 'punch' || type === 'kick';
                const nextIsSpecialOrGrab = ['special', 'grab', 'ranged'].includes(type);
                
                // Normal moves can cancel into other normals or specials/grabs if they are past startup (>= 40% complete) AND have connected.
                // You cannot cancel a move into itself (e.g., punch into punch) to prevent infinite loops.
                // Any move can cancel into any other if in MoE/Super state!
                if (this.isMoE || (currentIsNormal && (nextIsNormal || nextIsSpecialOrGrab) && this.attackConnected && !this.currentMove.includes(type))) {
                    if (this.stateTimer <= this.stateTimerMax * 0.6) {
                        this.state = 'idle';
                        this.hitbox = null;
                        createParticles(this.x, this.y - 60, '#ffffff', 4, true); // Visual indicator of cancel
                    }
                }
                
                // Existing vendor-specific cancel overrides:
                const isPunchOrKick = this.currentMove.includes('punch') || this.currentMove.includes('kick');
                if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'anthropic' && this.isMoE) {
                    if (isPunchOrKick && (type === 'special' || type === 'ranged')) {
                        this.state = 'idle';
                        this.hitbox = null;
                    }
                }
                if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'mistral' && this.currentMove === 'fwd_kick') {
                    if (type === 'special' || type === 'ranged') {
                        this.state = 'idle';
                        this.hitbox = null;
                    }
                }
            }

            if(this.state !== 'attack' && this.state !== 'block' && this.state !== 'charge') {
                
                let moveVariant = type;
                if(type === 'punch' || type === 'kick') {
                    const isFwd = (this.dir === 1 && AIEngine.Input.isActionActive('right')) || (this.dir === -1 && AIEngine.Input.isActionActive('left'));
                    const isDown = this.isPlayer ? AIEngine.Input.isActionActive('crouch') : this.aiCrouching;
                    if (this.y < GROUND_Y) moveVariant = `jump_${type}`;
                    else if (isDown) moveVariant = `crouch_${type}`;
                    else if (isFwd) moveVariant = `fwd_${type}`;
                }
                
                // Weapon interact check
                if (type === 'grab' && !this.weapon && this.y >= GROUND_Y) {
                    let grabbedWeapon = false;
                    for (let i=0; i<fightState.weapons.length; i++) {
                        let w = fightState.weapons[i];
                        if (Math.abs(w.x - this.x) < 50) {
                            this.weapon = w;
                            fightState.weapons.splice(i, 1);
                            grabbedWeapon = true;
                            // Play pickup animation
                            this.state = 'attack';
                            this.currentMove = 'pickup';
                            this.stateTimer = 15;
                            this.stateTimerMax = 15;
                            this.hitbox = null;
                            return; // skip grab attack
                        }
                    }
                }
                
                // Throw weapon
                if (type === 'ranged' && this.weapon) {
                    fightState.projectiles.push(new Projectile(this.x + this.dir*40, this.y - 60, this.dir, this.dmg * 2, this.color, this.tier, 'weapon', this.data.vendor, this.isPlayer));
                    this.weapon = null;
                    this.state = 'attack';
                    this.currentMove = 'throw_weapon';
                    this.stateTimer = 20;
                    this.stateTimerMax = 20;
                    this.hitbox = null;
                    if(this.isPlayer) Audio.hit();
                    return;
                }
                
                // DeepSeek MTP strike queuing
                if (isStart && (type === 'punch' || type === 'kick')) {
                    if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'deepseek' && this.reasoningTokens >= 50) {
                        this.reasoningTokens -= 50;
                        this.mtpTimer = 8; // Double hit delay
                    }
                }
                
                this.state = 'attack';
                this.currentMove = moveVariant;
                this.attackConnected = false; // Reset connection status!
                
                let baseDuration = type === 'special' ? 36 : 20; 
                if (type === 'grab') baseDuration = 25;
                
                // DeepSeek MLA attack compression
                if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'deepseek') {
                    baseDuration = Math.round(baseDuration * 0.8);
                }
                // Google AUDIO modality speed compression
                if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'google' && this.activeModality === 'AUDIO' && (type === 'punch' || type === 'kick')) {
                    baseDuration = Math.round(baseDuration * 0.75);
                }
                
                this.stateTimer = baseDuration;
                this.stateTimerMax = this.stateTimer;
                
                // Base hitbox logic
                let hx = this.x + (this.dir * (this.w/2 + 20));
                let hy = this.y - 60;
                let hw = 40;
                let hh = 30;
                let dmgMod = 1;
                
                if (moveVariant === 'crouch_punch') { // UPPERCUT!
                    hy = this.y - 80;
                    hh = 50;
                    hw = 45;
                    dmgMod = 1.6;
                } else if (moveVariant === 'crouch_kick') { // SWEEP!
                    hy = this.y - 15;
                    hh = 20;
                    hw = 65;
                    dmgMod = 1.2;
                } else if (moveVariant === 'fwd_kick') { // ROUNDHOUSE!
                    hy = this.y - 45;
                    hh = 35;
                    hw = 65;
                    hx += this.dir * 15;
                    dmgMod = 1.35;
                } else {
                    if (moveVariant.includes('kick')) { hy = this.y - 20; dmgMod = 1.1; }
                    if (moveVariant.includes('fwd_')) { hw = 60; hx += this.dir * 10; dmgMod *= 1.2; }
                    if (moveVariant.includes('crouch_')) { hy = this.y - 15; dmgMod *= 0.8; }
                    if (moveVariant.includes('jump_')) { hy = this.y - 40; dmgMod *= 1.1; }
                }
                
                if (this.weapon && moveVariant.includes('punch')) {
                    hw += 40; hx += this.dir * 20; dmgMod *= 1.5; // Weapon reach & dmg
                }
                
                let baseDmgVal = this.dmg;
                if (this.isLimitBroken) baseDmgVal *= 1.5;
                
                this.hitbox = {
                    x: hx, y: hy, w: type === 'special' ? 60 : hw, h: hh,
                    active: true,
                    damage: (type === 'special' ? baseDmgVal * 2 : baseDmgVal) * dmgMod,
                    type: moveVariant,
                    unblockable: type === 'grab'
                };
                
                // Google VISION modality hitbox expansion
                if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'google' && this.activeModality === 'VISION' && this.hitbox) {
                    this.hitbox.w *= 1.35;
                    this.hitbox.h *= 1.35;
                    this.hitbox.x += this.dir * 15;
                }
                
                if (type === 'ranged') {
                    this.hitbox = null;
                    const vend = this.data.vendor.toLowerCase();
                    
                    if (vend === 'openai') {
                        if (this.cotTokens === 3) {
                            fightState.projectiles.push(new Projectile(this.x + this.dir*12, this.y - 60, this.dir, baseDmgVal * 0.7, this.color, this.tier, 'energy', this.data.vendor, this.isPlayer, -2));
                            fightState.projectiles.push(new Projectile(this.x + this.dir*12, this.y - 60, this.dir, baseDmgVal * 0.7, this.color, this.tier, 'energy', this.data.vendor, this.isPlayer, 0));
                            fightState.projectiles.push(new Projectile(this.x + this.dir*12, this.y - 60, this.dir, baseDmgVal * 0.7, this.color, this.tier, 'energy', this.data.vendor, this.isPlayer, 2));
                            if (this.isPlayer) Audio.super();
                        } else {
                            let dmgBoost = 1.0 + (this.cotTokens || 0) * 0.20;
                            fightState.projectiles.push(new Projectile(this.x + this.dir*12, this.y - 60, this.dir, baseDmgVal * 0.8 * dmgBoost, this.color, this.tier, 'energy', this.data.vendor, this.isPlayer));
                            if (this.isPlayer) Audio.hit();
                        }
                        this.cotTokens = 0;
                    } else {
                        let proj = new Projectile(this.x + this.dir*12, this.y - 60, this.dir, baseDmgVal * 0.8, this.color, this.tier, 'energy', this.data.vendor, this.isPlayer);
                        if (vend === 'google') {
                            proj.modality = this.activeModality;
                        }
                        fightState.projectiles.push(proj);
                        if(this.isPlayer) Audio.hit();
                    }
                }
                else if (type === 'grab') {
                    this.hitbox.w = 50; 
                    this.hitbox.damage = 0; 
                }
                else if (type === 'special') {
                    this.hitbox = null; // Projectiles deal the damage
                    const vendor = this.data.vendor.toLowerCase();
                    const spawnX = this.x + this.dir * 15;
                    const spawnY = this.y - 60;
                    
                    let finalDmg = this.dmg * 1.8;
                    
                    // OpenAI CoT Boost
                    let cotBoost = 1.0;
                    let isPerfectAlignment = false;
                    if (vendor === 'openai') {
                        cotBoost = 1.0 + (this.cotTokens || 0) * 0.20;
                        if (this.cotTokens === 3) isPerfectAlignment = true;
                        this.cotTokens = 0;
                    }
                    
                    if(!this.data.hasMoE && this.ki >= 100) {
                        finalDmg = this.dmg * 3.5;
                        this.ki = 0;
                        if(this.isPlayer) Audio.super();
                    } else if (this.data.hasMoE && this.isMoE) {
                        finalDmg = this.dmg * 2.2;
                        const kiCost = vendor === 'deepseek' ? 10 : 20;
                        this.ki = Math.max(0, this.ki - kiCost);
                    }
                    
                    finalDmg *= cotBoost;
                    
                    // Spawn model-specific visual attacks
                    if (vendor === 'google') {
                        let beamProj = new Projectile(spawnX, spawnY, this.dir, finalDmg, this.color, this.tier, 'beam', this.data.vendor, this.isPlayer);
                        beamProj.modality = this.activeModality;
                        fightState.projectiles.push(beamProj);
                    } else if (vendor === 'openai') {
                        const opp = this.isPlayer ? fightState.p2 : fightState.p1;
                        if (opp) {
                            let projType = isPerfectAlignment ? 'box_perfect' : 'box';
                            fightState.projectiles.push(new Projectile(opp.x, opp.y, this.dir, finalDmg, this.color, this.tier, projType, this.data.vendor, this.isPlayer));
                            if (isPerfectAlignment && this.isPlayer) Audio.super();
                        }
                    } else if (vendor === 'anthropic') {
                        fightState.projectiles.push(new Projectile(spawnX, spawnY - 18, this.dir, finalDmg * 0.35, this.color, this.tier, 'sword', this.data.vendor, this.isPlayer));
                        fightState.projectiles.push(new Projectile(spawnX, spawnY, this.dir, finalDmg * 0.35, this.color, this.tier, 'sword', this.data.vendor, this.isPlayer));
                        fightState.projectiles.push(new Projectile(spawnX, spawnY + 18, this.dir, finalDmg * 0.35, this.color, this.tier, 'sword', this.data.vendor, this.isPlayer));
                    } else if (vendor === 'meta') {
                        if (this.metaCurrentSize === '405B') {
                            fightState.projectiles.push(new Projectile(spawnX, spawnY - 24, this.dir, finalDmg * 0.5, this.color, this.tier, 'llama', this.data.vendor, this.isPlayer));
                            fightState.projectiles.push(new Projectile(spawnX, spawnY, this.dir, finalDmg * 0.5, this.color, this.tier, 'llama', this.data.vendor, this.isPlayer));
                            fightState.projectiles.push(new Projectile(spawnX, spawnY + 24, this.dir, finalDmg * 0.5, this.color, this.tier, 'llama', this.data.vendor, this.isPlayer));
                            this.metaParameters = 0;
                            this.metaCurrentSize = '8B';
                            createParticles(this.x, this.y - 60, '#ffffff', 15);
                        } else {
                            fightState.projectiles.push(new Projectile(spawnX, spawnY, this.dir, finalDmg, this.color, this.tier, 'llama', this.data.vendor, this.isPlayer));
                        }
                    } else if (vendor === 'mistral') {
                        fightState.projectiles.push(new Projectile(spawnX, spawnY, this.dir, finalDmg * 0.35, this.color, this.tier, 'slash', this.data.vendor, this.isPlayer, -3));
                        fightState.projectiles.push(new Projectile(spawnX, spawnY, this.dir, finalDmg * 0.35, this.color, this.tier, 'slash', this.data.vendor, this.isPlayer, 0));
                        fightState.projectiles.push(new Projectile(spawnX, spawnY, this.dir, finalDmg * 0.35, this.color, this.tier, 'slash', this.data.vendor, this.isPlayer, 3));
                    } else { // deepseek / others
                        fightState.projectiles.push(new Projectile(spawnX, spawnY, this.dir, finalDmg, this.color, this.tier, 'deepseek_special', this.data.vendor, this.isPlayer));
                    }
                }
                
                if (type !== 'special' && type !== 'ranged') {
                    if(this.isPlayer) Audio.hit();
                }
            }
        }
    }

    update(dt) {
        this.animTime += dt;
        if (this.aiAttackCooldown > 0) {
            this.aiAttackCooldown -= dt * 60;
        }
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt * 60;
        }
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt * 60;
        }

        // --- PLAYER BUFFERED COMBOS & ACTIONS ---
        if (this.isPlayer && fightState.active) {
            const isBlocking = AIEngine.Input.isActionActive('block');
            const isCharging = AIEngine.Input.isActionActive('charge');
            
            if (isBlocking && (this.state === 'idle' || this.state === 'walk')) {
                this.action('block', true);
            } else if (!isBlocking && this.state === 'block') {
                this.action('block', false);
            }
            
            if (isCharging && (this.state === 'idle' || this.state === 'walk')) {
                this.action('charge', true);
            } else if (!isCharging && this.state === 'charge') {
                this.action('charge', false);
            }
            
            const forwardKey = this.dir === 1 ? 'd' : 'a';
            const forwardArrow = this.dir === 1 ? 'arrowright' : 'arrowleft';
            
            const qcfP = AIEngine.Input.Buffer.matchSequence(['s', forwardKey, 'p'], 350) || 
                         AIEngine.Input.Buffer.matchSequence(['arrowdown', forwardArrow, 'p'], 350);
            
            const qcfK = AIEngine.Input.Buffer.matchSequence(['s', forwardKey, 'k'], 350) || 
                         AIEngine.Input.Buffer.matchSequence(['arrowdown', forwardArrow, 'k'], 350);
                         
            if (qcfP || qcfK) {
                AIEngine.Input.Buffer.clear();
                this.action('special');
            } else {
                if (AIEngine.Input.Buffer.consume('p')) {
                    this.action('punch');
                } else if (AIEngine.Input.Buffer.consume('k')) {
                    this.action('kick');
                } else if (AIEngine.Input.Buffer.consume('q')) {
                    this.action('grab');
                } else if (AIEngine.Input.Buffer.consume('r')) {
                    this.action('ranged');
                } else if (AIEngine.Input.Buffer.consume('e') || AIEngine.Input.Buffer.consume('f') || AIEngine.Input.Buffer.consume(' ')) {
                    this.action('special');
                }
            }
        }

        // Reset tripRotation if we are in an upright or fully flat KO/knockdown state
        if (['idle', 'walk', 'jump', 'land', 'block', 'charge', 'moe_transform', 'attack', 'ko', 'knockdown'].includes(this.state)) {
            this.tripRotation = 0;
        }

        // Crouch check
        this.isCrouching = (this.state === 'idle' || this.state === 'block') && this.y >= GROUND_Y && 
                           (this.isPlayer ? AIEngine.Input.isActionActive('crouch') : this.aiCrouching);
        if (this.limitBreakTimer > 0) {
            this.limitBreakTimer -= dt;
            if (this.limitBreakTimer <= 0) {
                this.isLimitBroken = false;
            }
            // Golden sparks visual flare
            if (Math.random() < 0.12) {
                createParticles(this.x + (Math.random() - 0.5) * 35, this.y - 20 - Math.random() * 60, '#FFD700', 1, true);
            }
        }

        if (this.hallucinationTime > 0) {
            this.hallucinationTime -= dt;
            if (Math.random() < 0.05) {
                this.vx += (Math.random() - 0.5) * 80; // random jitter stagger
                createParticles(this.x, this.y - 50, '#0467DF', 1);
            }
        }

        // --- GOOGLE PASSIVES ---
        if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'google') {
            const contextMultiplier = this.activeModality === 'TEXT' ? 1.5 : 1.0;
            let contextGain = 0;
            
            if (this.state === 'charge') {
                contextGain = dt * 400000;
            } else if (this.state === 'walk') {
                contextGain = dt * 40000;
            } else if (this.state === 'idle') {
                contextGain = dt * 10000;
            }
            this.contextTokens = Math.min(this.maxContextTokens, this.contextTokens + contextGain * contextMultiplier);
        }

        // --- OPENAI PASSIVES ---
        if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'openai') {
            if (this.safetyTimer > 0) {
                this.safetyTimer -= dt;
                if (this.safetyTimer < 0) this.safetyTimer = 0;
            }
            
            if (this.state === 'charge') {
                this.cotChargeProgress += dt;
                if (this.cotChargeProgress >= 1.0) {
                    if (this.cotTokens < 3) {
                        this.cotTokens++;
                        createParticles(this.x, this.y - 80, '#10A37F', 6, true);
                        if (this.isPlayer) Audio.playTone(600 + this.cotTokens * 100, 'sine', 0.15, 0.15);
                    }
                    this.cotChargeProgress = 0;
                }
            } else {
                this.cotChargeProgress = 0;
            }
            
            // Omni-Modal Vision: Opponent attack anticipation
            const opponent = this.isPlayer ? fightState.p2 : fightState.p1;
            if (opponent && opponent.state === 'attack' && opponent.hitbox && opponent.hitbox.active) {
                const dist = Math.abs(this.x - opponent.x);
                if (dist < 120 && ['idle', 'walk', 'block'].includes(this.state)) {
                    if (this.state === 'block') {
                        this.perfectGuardActive = true;
                    } else if (this.cotTokens > 0) {
                        this.cotTokens--;
                        this.x -= this.dir * 140;
                        this.state = 'idle';
                        this.vx = 0;
                        createParticles(this.x + this.dir * 140, this.y - 50, '#10A37F', 15, false, true);
                        if (this.isPlayer) Audio.playTone(850, 'square', 0.12, 0.12);
                    }
                }
            } else {
                this.perfectGuardActive = false;
            }
        }

        // --- META PASSIVES ---
        if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'meta') {
            ['punch', 'kick', 'projectile'].forEach(cat => {
                if (this.metaFineTuneTimer[cat] > 0) {
                    this.metaFineTuneTimer[cat] -= dt;
                    if (this.metaFineTuneTimer[cat] <= 0) {
                        this.metaFineTune[cat] = Math.max(0, this.metaFineTune[cat] - 1);
                        if (this.metaFineTune[cat] > 0) {
                            this.metaFineTuneTimer[cat] = 5.0;
                        }
                    }
                }
            });

            if (this.state === 'charge') {
                this.metaParameters = Math.min(100, this.metaParameters + dt * 45);
            } else {
                this.metaParameters = Math.max(0, this.metaParameters - dt * 2.5);
            }

            let oldSize = this.metaCurrentSize;
            if (this.metaParameters < 33) {
                this.metaCurrentSize = '8B';
            } else if (this.metaParameters >= 33 && this.metaParameters < 66) {
                this.metaCurrentSize = '70B';
            } else {
                this.metaCurrentSize = '405B';
            }

            if (oldSize !== this.metaCurrentSize) {
                createParticles(this.x, this.y - 60, '#ffffff', 10);
                if (this.metaCurrentSize === '405B') {
                    Audio.moe();
                }
            }
        }

        // --- MISTRAL PASSIVES ---
        if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'mistral') {
            if (this.hp < this.maxHp * 0.35) {
                if (!this.isFineTuned) {
                    this.isFineTuned = true;
                    if (typeof showAnnouncement !== 'undefined') showAnnouncement("Fine-Tuned Optimization!");
                    createParticles(this.x, this.y - 50, '#FF7000', 15, true);
                }
                if (Math.random() < 0.15) {
                    createParticles(this.x + (Math.random()-0.5)*30, this.y - 40, '#FF7000', 1, true);
                }
            } else {
                this.isFineTuned = false;
            }

            if (this.isMoE && this.data.id === 'mixtral-8x7b') {
                if (this.expertTimer === undefined) this.expertTimer = 0;
                this.expertTimer -= dt;
                if (this.expertTimer <= 0) {
                    this.expertTimer = 4.0;
                    const expertsPool = ["Math (Dmg)", "Code (Spd)", "Vision (Def)", "Agent (Heal)", "Chat (Ki)", "Instruct (Stun)", "Web (Sticky)"];
                    let e1 = Math.floor(Math.random() * expertsPool.length);
                    let e2 = Math.floor(Math.random() * expertsPool.length);
                    while (e2 === e1) {
                        e2 = Math.floor(Math.random() * expertsPool.length);
                    }
                    this.activeExperts = [expertsPool[e1], expertsPool[e2]];
                    createParticles(this.x, this.y - 60, '#FF7000', 8, true);
                    if (this.isPlayer && typeof showAnnouncement !== 'undefined') {
                        showAnnouncement(`Routing: ${this.activeExperts[0]} + ${this.activeExperts[1]}`);
                    }
                }
                
                if (this.activeExperts) {
                    this.activeExperts.forEach(exp => {
                        if (exp.includes("Heal")) {
                            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.005 * dt);
                        }
                        if (exp.includes("Ki")) {
                            this.ki = Math.min(this.maxKi, this.ki + 8 * dt);
                        }
                    });
                }
            }
        }

        // --- DEEPSEEK PASSIVES ---
        if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'deepseek' && fightState.active) {
            const opp = this.isPlayer ? fightState.p2 : fightState.p1;
            
            if (opp) {
                if (opp.state === 'hit') {
                    this.currentExpert = 'combust';
                } else if (opp.state === 'attack' || this.hp < this.maxHp * 0.4) {
                    this.currentExpert = 'contain';
                } else {
                    this.currentExpert = 'shared';
                }
            }

            if (['idle', 'walk', 'charge'].includes(this.state)) {
                const accumulateRate = this.state === 'charge' ? 40 : 15;
                this.reasoningTokens = Math.min(100, this.reasoningTokens + dt * accumulateRate);
            }

            if (this.reasoningTokens > 0) {
                this.cotParticleTimer -= dt * 60;
                if (this.cotParticleTimer <= 0) {
                    this.cotParticleTimer = Math.max(5, 45 - (this.reasoningTokens * 0.35));
                    const mathSymbols = ['Σ', 'λ', '√', 'π', 'θ', '∫', 'f', 'x', 'y', 'Δ'];
                    const randSym = mathSymbols[Math.floor(Math.random() * mathSymbols.length)];
                    fightState.particles.push({
                        x: this.x + (Math.random() - 0.5) * 44,
                        y: this.y - 95 - Math.random() * 15,
                        vx: (Math.random() - 0.5) * 2,
                        vy: -Math.random() * 1.5 - 0.5,
                        life: 1.2,
                        color: '#00f0ff',
                        size: Math.random() * 3 + 4,
                        isMathSymbol: true,
                        symbol: randSym
                    });
                }
            }

            if (this.mtpTimer > 0) {
                this.mtpTimer -= dt * 60;
                if (this.mtpTimer <= 0 && this.state === 'attack' && opp) {
                    let hx = this.x + (this.dir * (this.w / 2 + 20));
                    let hy = this.y - 60;
                    let hw = 60;
                    let hh = 30;
                    if (this.currentMove.includes('kick')) hy = this.y - 20;
                    if (this.currentMove.includes('crouch_')) hy = this.y - 15;
                    if (this.currentMove.includes('jump_')) hy = this.y - 40;
                    
                    if (Math.abs(hx - opp.x) < (hw / 2 + opp.w / 2) && Math.abs(hy - opp.y) < (hh / 2 + opp.h / 2)) {
                        opp.takeDamage(this.dmg * 0.75, this.currentMove + '_mtp', false);
                        createParticles(opp.x, opp.y - 60, '#00f0ff', 12, false, true);
                        if (this.isPlayer) Audio.hit();
                    }
                }
            }
        }
        
        if(!this.isPlayer && fightState.active) {
            this.updateAI();
            // Google AI modality cycle logic
            if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'google') {
                this.modalityTimer += dt;
                if (this.modalityTimer > 5.0) {
                    this.modalityTimer = 0;
                    this.cycleModality();
                }
            }
        }

        if(this.state === 'hit') {
            this.stateTimer -= dt * 60;
            this.vx += (0 - this.vx) * 10 * dt; // slide deceleration
            if(this.stateTimer <= 0 && this.y >= GROUND_Y) {
                this.state = 'idle';
                this.combo = 0; // Reset combo count!
            }
        }
        else if(this.state === 'land') {
            this.stateTimer -= dt * 60;
            this.vx += (0 - this.vx) * 14 * dt; // landing deceleration
            if(this.stateTimer <= 0) this.state = 'idle';
        }
        else if(this.state === 'ko') {
            // Apply slide deceleration to prevent sliding off the screen
            if (this.y >= GROUND_Y) {
                this.vx += (0 - this.vx) * 7.5 * dt;
                this.y = GROUND_Y;
                this.vy = 0;
            }
        }
        else if(this.state === 'dizzy') {
            this.stateTimer -= dt * 60;
            this.vx += (0 - this.vx) * 8 * dt; // slide deceleration
            if (this.y > GROUND_Y) {
                this.y = GROUND_Y;
                this.vy = 0;
            }
            if(this.stateTimer <= 0) {
                // Dizzy timeout: collapse to standard KO!
                this.state = 'ko';
                this.vx = -this.dir * 80;
                this.vy = -180;
                this.tripRotation = 0;
            }
        }
        else if(this.state === 'fatality_active') {
            this.stateTimer -= dt * 60;
            this.vx = 0; this.vy = 0;
            
            const victim = this.isPlayer ? fightState.p2 : fightState.p1;
            
            // Phase 1: Close in on victim
            if (this.stateTimer > 180) {
                const targetX = victim.x - this.dir * 55;
                this.x += (targetX - this.x) * 10 * dt;
            }
            
            // Phase 3: At frame 120, trigger the hit/destruction
            if (this.stateTimer <= 120 && !this.fatalityHitTriggered) {
                this.fatalityHitTriggered = true;
                fightState.shake = 28;
                Audio.heavyHit();
                
                const vend = this.data && this.data.vendor ? this.data.vendor.toLowerCase() : '';
                const bloodColor = (vend === 'openai') ? '#10A37F' : (vend === 'anthropic' ? '#FFE082' : this.color);
                
                createDirectionalBlood(victim.x, victim.y - 60, '#ff0000', 35, -this.dir * 3, -1.5);
                createDirectionalBlood(victim.x, victim.y - 60, bloodColor, 30, -this.dir * 3, -1.5);
                victim.wasVaporized = true;
            }
            
            if (this.stateTimer <= 0) {
                this.state = 'idle';
                victim.state = 'ko'; // triggers win condition check!
                fightState.fatalityActive = false;
                fightState.active = true; // temporarily re-enable to allow win condition evaluation
                checkWinCondition();
            }
        }
        else if (this.state === 'fatality_victim') {
            this.stateTimer -= dt * 60;
            this.vx = 0; this.vy = 0;
            
            // Shaking in fear during startup
            if (this.stateTimer > 120) {
                this.x += (Math.random() - 0.5) * 3;
            }
        }
        else if(this.state === 'knockdown') {
            this.stateTimer -= dt * 60;
            if (this.y >= GROUND_Y) {
                this.y = GROUND_Y;
                if (!this.hasBounced) {
                    this.hasBounced = true;
                    this.vy = -180; // Bounce pop up!
                    this.vx *= 0.55; // Dampen slide
                    fightState.shake = 15; // Impact shake
                    createParticles(this.x, this.y - 10, '#ffffff', 18);
                    Audio.hit(); // Slam impact sound
                } else {
                    this.vy = 0;
                    this.vx += (0 - this.vx) * 12 * dt; // quick slide deceleration
                }
            }
            if(this.stateTimer <= 0) {
                this.state = 'get_up';
                this.stateTimer = 25;
                this.stateTimerMax = 25;
                this.vx = 0;
                this.hasBounced = false; // Reset flag
            }
        }
        else if(this.state === 'get_up') {
            this.stateTimer -= dt * 60;
            this.vx = 0;
            if(this.stateTimer <= 0) {
                this.state = 'idle';
            }
        }
        else if(this.state === 'throwing') {
            this.stateTimer -= dt * 60;
            const opponent = this.isPlayer ? fightState.p2 : fightState.p1;
            if (opponent) {
                if(this.stateTimer > 0) {
                    const p = 1 - Math.max(0, Math.min(1, this.stateTimer / 40));
                    if (p < 0.35) {
                        // Grab phase: hold in front
                        opponent.x = this.x + this.dir * 28;
                        opponent.y = this.y - 12;
                    } else {
                        // Suplex overhead throw arc!
                        const throwPct = (p - 0.35) / 0.65;
                        const theta = throwPct * Math.PI; // 0 to 180 degrees (0 to Math.PI)
                        
                        opponent.x = this.x + Math.cos(theta) * 35 * this.dir;
                        opponent.y = this.y - 45 - Math.sin(theta) * 75;
                    }
                } else {
                    this.state = 'idle';
                    
                    // Throw release: opponent is slammed down behind attacker
                    opponent.x = this.x - this.dir * 60;
                    opponent.y = GROUND_Y - 5;
                    opponent.vy = -250; // Bounce up
                    opponent.vx = -this.dir * 320; // Float back
                    opponent.hasBounced = false;
                    
                    // Transition victim directly to knockdown
                    opponent.state = 'knockdown';
                    opponent.stateTimer = 45;
                    opponent.stateTimerMax = 45;
                    opponent.tripRotation = opponent.dir === this.dir ? Math.PI : -Math.PI;
                    
                    opponent.takeDamage(this.dmg * 1.5, 'throw_impact', true);
                    createParticles(opponent.x, opponent.y - 15, '#ffffff', 25);
                    fightState.shake = 12;
                    fightState.hitStop = 6;
                    Audio.hit();
                }
            }
        }
        else if(this.state === 'grabbed') {
            this.vx = 0; this.vy = 0;
            this.stateTimer -= dt * 60;
            if (this.stateTimer <= 0) {
                this.state = 'idle';
            }
            return; 
        }
        else if(this.state === 'attack') {
            this.stateTimer -= dt * 60;
            if(this.currentMove !== 'dash' && this.y >= GROUND_Y) {
                this.vx += (0 - this.vx) * 12 * dt; // halt forward movement during standard attacks
            }
            
            // Add Smear (Motion Trail) for heavy/fast attacks or dashes
            if ((this.currentMove === 'dash' || (this.hitbox && this.hitbox.active)) && this.stateTimer % 2 < 1) {
                fightState.smears.push({
                    x: this.x, y: this.y, tier: this.tier,
                    time: this.animTime, stateTimer: this.stateTimer,
                    dir: this.dir, state: this.state, move: this.currentMove,
                    life: 1.0, color: this.color, weapon: this.weapon
                });
            }
            
            if(this.stateTimer < 10 && this.hitbox) this.hitbox.active = false;
            if(this.stateTimer <= 0) {
                this.state = 'idle';
                this.hitbox = null;
                this.attackCooldown = this.attackConnected ? 8 : 18; // 8 frames on hit, 18 frames on whiff recovery!
            }
        }
        else if(this.state === 'moe_transform') {
            this.stateTimer -= dt * 60;
            if(this.stateTimer <= 0) {
                this.state = 'idle';
                this.isMoE = true;
                if(this.data.hasMoE) this.tier = Math.min(5, this.tier + 1);
            }
        }
        else if(this.state === 'charge') {
            this.vx += (0 - this.vx) * 15 * dt; // halt during charging
            
            // Ki charging speed multipliers: Mistral GQA (+20%), DeepSeek MLA (+50%)
            const vend = this.data && this.data.vendor ? this.data.vendor.toLowerCase() : '';
            let chargeRate = 15;
            if (vend === 'mistral') chargeRate = 18;
            else if (vend === 'deepseek') chargeRate = 22.5;
            
            this.ki += dt * chargeRate;
            
            // If already max Ki (or already MoE), perform DBZ overcharging
            if (this.ki >= this.maxKi) {
                this.ki = this.maxKi;
                
                if (this.overchargeLevel === undefined) this.overchargeLevel = 0;
                this.overchargeLevel += dt;
                
                // Screen shake and sound effects
                fightState.shake = Math.max(fightState.shake || 0, Math.min(10, this.overchargeLevel * 4.5));
                if (Math.random() < 0.28) {
                    Audio.playTone(300 + Math.sin(this.animTime * 10) * 80, 'sawtooth', 0.1, 0.04);
                }
                
                // Giant roaring DBZ gold particles
                if (Math.random() < 0.45) {
                    fightState.particles.push({
                        x: this.x + (Math.random() - 0.5) * 55,
                        y: this.y - Math.random() * 95,
                        vx: (Math.random() - 0.5) * 4,
                        vy: -Math.random() * 6 - 3,
                        life: 0.8,
                        color: '#FFD700', // DBZ golden aura
                        size: Math.random() * 4 + 2.5,
                        isDigit: Math.random() > 0.45
                    });
                }
                
                // Overheat Explosion!
                if (this.overchargeLevel >= 2.0) {
                    this.state = 'hit';
                    this.stateTimer = 25; // Self-stagger
                    this.stateTimerMax = 25;
                    this.ki = 0;
                    this.overchargeLevel = 0;
                    fightState.shake = 22;
                    Audio.playTone(150, 'sawtooth', 0.6, 0.45); // Explode sound
                    createParticles(this.x, this.y - 50, '#FF4500', 35, false, true); // Fire blast
                    
                    if (typeof showAnnouncement !== 'undefined') showAnnouncement("OVERHEAT!");
                    
                    const opp = this.isPlayer ? fightState.p2 : fightState.p1;
                    if (opp && Math.abs(this.x - opp.x) < 140) {
                        opp.takeDamage(this.dmg * 1.5, 'special', true);
                    }
                }
            } else {
                this.overchargeLevel = 0;
                if(this.ki % 10 < 1) createParticles(this.x + (Math.random()-0.5)*50, this.y, this.color, 1, true);
                
                // Normal MoE transformation check (only if not already transformed)
                if(this.data.hasMoE && !this.isMoE && this.ki >= this.data.moeThreshold) {
                    this.state = 'moe_transform';
                    this.stateTimer = 60; 
                    this.stateTimerMax = 60;
                    this.combo = 0;
                    flashScreen(this.color);
                    Audio.moe();
                    showAnnouncement(this.data.moeName);
                    if(this.isPlayer) document.getElementById('hud-p1-name').textContent = this.data.moeName.toUpperCase();
                    else document.getElementById('hud-p2-name').textContent = this.data.moeName.toUpperCase();
                }
            }
        }
        else if(this.state === 'idle' || this.state === 'walk' || this.state === 'jump') {
            if(this.isPlayer && fightState.active) {
                let isLeft = AIEngine.Input.isActionActive('left');
                let isRight = AIEngine.Input.isActionActive('right');
                const isJump = AIEngine.Input.isActionActive('jump') && this.y >= GROUND_Y;
                
                // Hallucination Control Inversion
                if (this.hallucinationTime > 0) {
                    const temp = isLeft;
                    isLeft = isRight;
                    isRight = temp;
                }
                
                let targetVx = 0;
                if(isLeft) targetVx = -this.spd * 58;
                if(isRight) targetVx = this.spd * 58;
                
                if (this.state === 'jump') {
                    this.vx += (targetVx - this.vx) * 16 * dt; // Snappier air steering
                } else {
                    this.vx += (targetVx - this.vx) * 48 * dt; // Responsive ground walk snappiness
                }
                
                if(isJump) {
                    this.vy = this.jumpPower;
                    this.state = 'jump';
                    this.vx = targetVx * 0.95; // lock takeoff momentum
                } else if(this.y >= GROUND_Y) {
                    if(Math.abs(this.vx) > 20) this.state = 'walk';
                    else this.state = 'idle';
                }
            }
        }
        
        // Physics (skip if grabbed or fatality victim to avoid coordinate jitter)
        if (this.state !== 'grabbed' && this.state !== 'fatality_victim') {
            this.x += this.vx * dt;
            this.vy += this.gravity * dt;
            this.y += this.vy * dt;
            
            if(this.y > GROUND_Y) {
                const wasJumping = this.state === 'jump';
                this.y = GROUND_Y;
                this.vy = 0;
                if(wasJumping) {
                    this.state = 'land';
                    this.stateTimer = 6;
                    this.stateTimerMax = 6;
                    this.vx = 0;
                    if(this.isPlayer) Audio.hit(); // soft landing impact sound
                }
            }
        }
        
        const opponent = this.isPlayer ? fightState.p2 : fightState.p1;
        
        // Push-out collision if players overlap (skip during grabs, throws, or fatalities)
        if(opponent && this.state !== 'ko' && opponent.state !== 'ko' && 
           this.state !== 'fatality_active' && opponent.state !== 'fatality_active' &&
           this.state !== 'throwing' && this.state !== 'grabbed' &&
           opponent.state !== 'throwing' && opponent.state !== 'grabbed') {
            const dist = this.x - opponent.x;
            const minDist = (this.w + opponent.w) * 0.45;
            if(Math.abs(dist) < minDist) {
                const push = (minDist - Math.abs(dist)) * 0.5;
                const dir = dist === 0 ? (this.isPlayer ? -1 : 1) : Math.sign(dist);
                this.x += dir * push;
                opponent.x -= dir * push;
            }
        }
        
        // Keep players on the stage bounds
        this.x = Math.max(25, Math.min(1375, this.x));
        
        // Automatic turn to face opponent
        if(opponent && this.state !== 'ko' && this.state !== 'knockdown' && this.state !== 'get_up' && this.state !== 'fatality_active' && this.state !== 'fatality_victim') {
            if(this.x < opponent.x) this.dir = 1;
            else this.dir = -1;
        }
        
        // MoE transformation logic
        if (this.data.hasMoE && !this.isMoE) {
            if (this.ki >= this.data.moeThreshold) {
                this.isMoE = true;
                this.expertTimer = 0; // immediate route triggers!
                if (this.isPlayer) {
                    flashScreen(this.color);
                    Audio.moe();
                    showAnnouncement(this.data.moeName);
                    if(this.isPlayer) document.getElementById('hud-p1-name').textContent = this.data.moeName.toUpperCase();
                    else document.getElementById('hud-p2-name').textContent = this.data.moeName.toUpperCase();
                }
            }
        }

        // Torso & head lag (secondary physics motion)
        if (this.chestLag === undefined) this.chestLag = 0;
        const targetLag = - (this.vx * 0.0016) * this.dir;
        this.chestLag += (targetLag - this.chestLag) * dt * 12;
    }
    
    updateAI() {
        if(['ko', 'moe_transform', 'hit', 'grabbed', 'throwing', 'land', 'knockdown', 'get_up', 'dizzy', 'fatality_active', 'fatality_victim'].includes(this.state)) {
            if(this.state !== 'grabbed') this.vx = 0;
            return;
        }
        const p1 = fightState.p1;
        if (!p1) return;
        
        const dist = Math.abs(this.x - p1.x);
        const yDist = Math.abs(this.y - p1.y);
        const diff = gameState.currentOpponentIdx / 20; // difficulty scaling 0.0 -> 1.0 (Rung 1 to Rung 20)

        // Reset AI crouch by default unless explicitly crouching
        this.aiCrouching = false;
        
        // --- DIZZY/FINISH THEM AI TRIGGER ---
        if (p1.state === 'dizzy') {
            if (dist > 65) {
                this.vx = this.dir * this.spd * 48;
                this.state = 'walk';
            } else {
                this.vx = 0;
                this.state = 'idle';
                if (Math.random() < 0.18) {
                    this.executeFatality(p1);
                }
            }
            return;
        }
        
        // Jump attack logic: execute mid-air kick or punch if close to player
        if (this.state === 'jump') {
            if (dist < 120 && yDist < 120 && this.aiAttackCooldown <= 0 && Math.random() < 0.6) {
                this.action(Math.random() > 0.35 ? 'kick' : 'punch');
                this.aiAttackCooldown = 25;
            }
            return;
        }
        
        // Decouple charging behavior
        if(this.state === 'charge') {
            let maxTokensWanted = this.data.id === 'o3' ? 3 : 2;
            let openAiDoneCharging = (this.data.vendor && this.data.vendor.toLowerCase() === 'openai' && (this.cotTokens || 0) >= maxTokensWanted);
            
            if(dist < 140 || this.ki >= this.maxKi || openAiDoneCharging || Math.random() < 0.05) {
                this.action('charge', false); // Stop charging
            }
            this.vx = 0;
            return;
        }

        // --- MORTAL KOMBAT CLASSIC ANTI-AIR UPPERCUT COUNTER ---
        // If the player jumps in and gets close, high-tier AI immediately crouch-uppercuts!
        const playerIsJumpingIn = p1.state === 'jump' && p1.vy > 0;
        if (playerIsJumpingIn && dist < 145 && this.y >= GROUND_Y && Math.random() < 0.25 + (diff * 0.65)) {
            this.aiCrouching = true;
            this.vx = 0;
            if (dist < 90 && this.aiAttackCooldown <= 0) {
                this.action('punch'); // Trigger Uppercut!
                this.aiAttackCooldown = 35;
            }
            return;
        }

        // --- MORTAL KOMBAT AI ZONING & REACTION LOOPS ---
        
        // Long Range Strategy (> 230 pixels)
        if(dist > 230) {
            // Throw fireballs if player is idle or walking, else walk forward or charge
            if (p1.state === 'idle' && Math.random() < 0.05 + (diff * 0.12) && this.aiAttackCooldown <= 0) {
                this.action('ranged');
                this.aiAttackCooldown = 40;
            } else if(this.ki < (this.data.hasMoE ? this.data.moeThreshold : 100) && Math.random() < 0.08) {
                this.action('charge', true);
            } else {
                // Sizing and approach
                this.vx = this.dir * this.spd * 48;
                this.state = 'walk';
            }
        } 
        // Mid Range Spacing (85 - 230 pixels)
        else if(dist > 85) {
            // Baiting/spacing: occasionally walk backwards if player is approaching aggressively
            const playerIsApproaching = (p1.vx > 0 && this.dir === -1) || (p1.vx < 0 && this.dir === 1);
            if (playerIsApproaching && Math.random() < 0.05 + (diff * 0.25)) {
                this.vx = -this.dir * this.spd * 40; // Walk backwards (spacing bait!)
                this.state = 'walk';
            } else if (dist > 130 && Math.random() < 0.03 + (diff * 0.08) && this.y >= GROUND_Y && this.aiAttackCooldown <= 0) {
                // Jump-in kick
                this.vy = this.jumpPower;
                this.state = 'jump';
                this.vx = this.dir * this.spd * 42;
                this.aiAttackCooldown = 30;
            } else {
                // Walk forward
                this.vx = this.dir * this.spd * 48; 
                this.state = 'walk';
            }
            
            // Pre-emptive block/teleport reaction to player projectile
            if (p1.state === 'attack' && p1.currentMove === 'ranged' && Math.random() < 0.3 + (diff * 0.55)) {
                this.action('block', true);
                setTimeout(() => this.action('block', false), 220 + Math.random()*150);
            }
        } 
        // Melee Range (< 85 pixels)
        else {
            this.vx = 0;
            
            // Reactive Block: If player attacks, block with high probability (higher diff = perfect blocking)
            if (p1.state === 'attack' && Math.random() < 0.15 + (diff * 0.60)) { 
                this.action('block', true); 
                setTimeout(() => this.action('block', false), 200 + Math.random()*150); 
            } 
            // Anti-Turtle Grab: Grab player if they hold a block
            else if (p1.state === 'block' && Math.random() < 0.22 + (diff * 0.38) && this.aiAttackCooldown <= 0) { 
                this.action('grab');
                this.aiAttackCooldown = 30 + Math.random() * 30;
            }
            // Strike options: Crouch Sweep (crouch_kick) or standard combo strings
            else if (this.state !== 'block' && this.aiAttackCooldown <= 0) {
                const strikeChance = 0.08 + (diff * 0.18);
                if (Math.random() < strikeChance) {
                    const roll = Math.random();
                    if (roll < 0.28) {
                        // Crouch Sweep!
                        this.aiCrouching = true;
                        this.action('kick'); // Trigger crouch_kick sweep!
                        this.aiAttackCooldown = 30;
                    } else if (roll > 0.82 && this.ki >= 100) {
                        // Special move
                        this.action('special');
                        this.aiAttackCooldown = 40;
                    } else {
                        // Punch or Kick combo starter
                        const atk = roll > 0.55 ? 'kick' : 'punch';
                        this.action(atk);
                        this.aiAttackCooldown = 20 + Math.random() * 25;
                    }
                } else { 
                    this.state = 'idle'; 
                }
            }
        }
    }

    takeDamage(dmg, type, unblockable = false) {
        if (this.state === 'ko' || this.state === 'knockdown' || this.state === 'get_up' || this.state === 'fatality_active' || this.state === 'fatality_victim') return;

        // --- DIZZY FINISHER INTERCEPT ---
        if (this.state === 'dizzy') {
            if (type === 'projectile') {
                this.state = 'ko';
                this.vx = -this.dir * 180;
                this.vy = -180;
                this.tripRotation = 0;
                Audio.ko();
            } else {
                const attacker = this.isPlayer ? fightState.p2 : fightState.p1;
                if (attacker && Math.abs(attacker.x - this.x) < 130) {
                    attacker.executeFatality(this);
                }
            }
            return;
        }

        // --- Interrupt Throw / Break Grab on hit ---
        if (this.state === 'throwing') {
            const opponent = this.isPlayer ? fightState.p2 : fightState.p1;
            if (opponent && opponent.state === 'grabbed') {
                opponent.state = 'idle';
                opponent.vy = 0; // stop floating
            }
        }
        if (this.state === 'grabbed') {
            const opponent = this.isPlayer ? fightState.p2 : fightState.p1;
            if (opponent && opponent.state === 'throwing') {
                opponent.state = 'idle';
            }
        }

        const vend = this.data && this.data.vendor ? this.data.vendor.toLowerCase() : '';

        // --- Claude (Anthropic) Grab Damage mitigation ---
        if (vend === 'anthropic' && type === 'grabbed') {
            dmg *= 0.5;
        }

        // --- Meta (Llama) Fine-Tuning Adaptation Passive ---
        if (vend === 'meta') {
            let category = 'punch';
            if (type.includes('kick')) category = 'kick';
            else if (type === 'projectile' || type === 'deepseek_special' || type === 'beam' || type === 'box' || type === 'box_perfect' || type === 'sword' || type === 'slash' || type === 'llama') {
                category = 'projectile';
            }
            
            const resistance = (this.metaFineTune[category] || 0) * 0.15;
            dmg = dmg * (1 - resistance);
            
            this.metaFineTune[category] = Math.min(3, (this.metaFineTune[category] || 0) + 1);
            this.metaFineTuneTimer[category] = 5.0; // Reset decay timer
            this.metaParameters = Math.min(100, (this.metaParameters || 0) + 8);
            createParticles(this.x, this.y - 70, '#0467DF', 4, true); // blue sparks
        }

        // --- Meta 405B Super Armor ---
        const isMeta405B = vend === 'meta' && this.metaCurrentSize === '405B';
        if (isMeta405B && type !== 'special' && !unblockable) {
            let actualDmg = Math.max(1, dmg - (this.defBase * 0.2));
            this.hp -= actualDmg;
            this.ki += 2;
            if (this.ki > this.maxKi) this.ki = this.maxKi;
            
            createParticles(this.x, this.y - 60, this.color, 8);
            fightState.sparks.push({ x: this.x, y: this.y - 60, life: 0.6, dir: this.dir });
            
            if (this.hp <= 0) {
                this.hp = 0;
                fightState.slowMoTimer = 1.2;
                this.state = 'dizzy';
                this.stateTimer = 270;
                this.stateTimerMax = 270;
                this.vx = -this.dir * 180;
                this.vy = -120;
                this.tripRotation = 0;
                fightState.finishThemTimer = 150;
                Audio.ko();
                const opp = this.isPlayer ? fightState.p2 : fightState.p1;
                if (opp.state === 'throwing') opp.state = 'idle';
            }
            return; // Early return: skip hitstun stagger state
        }

        // --- OpenAI RLHF Eviction & Safety Guard ---
        if (vend === 'openai') {
            if (this.rlhfStacks > 0) {
                this.rlhfStacks = 0;
                this.safetyTimer = 3.0; // 3 seconds safety alignment
                createParticles(this.x, this.y - 60, '#10A37F', 12, true);
            }
            if (this.safetyTimer > 0) {
                dmg *= 0.75;
            }
        }

        // --- Mixtral MoE Vision Expert Defense Buff ---
        if (this.isMoE && this.activeExperts && this.activeExperts.some(e => e.includes("Def"))) {
            dmg *= 0.7; // 30% reduction
        }

        // --- DeepSeek Routed-Contain Expert Damage Mitigation ---
        if (vend === 'deepseek' && this.currentExpert === 'contain') {
            dmg *= 0.75; // 25% reduction
        }

        // --- Claude (Anthropic) Constitutional Guard Perfect Block Chance ---
        let isPerfectBlock = false;
        if (vend === 'anthropic' && Math.random() < 0.35 && this.state === 'block' && !unblockable) {
            isPerfectBlock = true;
        }

        if(this.state === 'block' && !unblockable) {
            this.hitFlashTimer = 5;
            // OpenAI Perfect Guard
            if (vend === 'openai' && this.perfectGuardActive) {
                dmg = 0;
                createParticles(this.x, this.y - 60, '#10A37F', 8);
                Audio.block();
                this.vx = -this.dir * 40; // Minimal pushback
            }
            // Claude Perfect Block
            else if (isPerfectBlock) {
                dmg = 0;
                createParticles(this.x, this.y - 60, '#FFE082', 10, true);
                Audio.block();
                // Play soft chime if available
                if (this.isPlayer) Audio.playTone(880, 'sine', 0.1, 0.1);
                this.vx = -this.dir * 25; // negligible pushback
            }
            else {
                // SWA block chip modifier
                const blockDmgMod = (vend === 'mistral') ? 0.12 : 0.2;
                dmg = dmg * blockDmgMod;
                
                createParticles(this.x, this.y - 60, '#ffffff', 5);
                Audio.block();
                
                // Blockstun pushback modifiers (SWA reduces it, Instruct Expert is immune)
                let pushback = 140;
                if (vend === 'mistral') pushback = 90;
                if (this.isMoE && this.activeExperts && this.activeExperts.some(e => e.includes("Stun"))) {
                    pushback = 0;
                }
                this.vx = -this.dir * pushback;
            }
        } else {
            this.hitFlashTimer = 8;
            // Determine custom state and physics for MK moves
            let nextState = 'hit';
            let duration = 15;
            let kb = type === 'special' || type === 'throw_impact' ? 380 : 200;
            let launchVy = 0;
            let shakeForce = 5;
            let hitStopFrs = 5;
            
            // Reset any previous trip rotation
            this.tripRotation = 0;
            
            if (type === 'crouch_punch') { // UPPERCUT!
                kb = 120;
                launchVy = -640;
                duration = 35; // Longer hitstun to allow juggles
                shakeForce = 15;
                hitStopFrs = 10;
                Audio.playTone(110, 'triangle', 0.35, 0.3); // Deep heavy bass hit
            } else if (type === 'crouch_kick') { // SWEEP!
                nextState = 'knockdown';
                duration = 38; // Time spent on the floor
                launchVy = -250;
                kb = 380;
                shakeForce = 8;
                this.tripRotation = -Math.PI / 2.5; // Rotate horizontal
            } else if (type === 'fwd_kick') { // ROUNDHOUSE!
                kb = 480;
                launchVy = -150;
                duration = 22;
                shakeForce = 10;
            } else if (type && type.includes('jump_')) { // JUMP KICK/PUNCH KNOCKDOWN!
                nextState = 'knockdown';
                duration = 32;
                launchVy = -180;
                kb = 320;
                this.tripRotation = -Math.PI / 3;
            } else if (this.y < GROUND_Y) { // AERIAL JUGGLE!
                launchVy = -180;
                kb = 150;
                duration = 20;
            }
            
            if (this.isLimitBroken) {
                // Super Armor! Ignore hit/knockdown state change and keep performing current action.
                // Apply reduced knockback and no vertical launch.
                kb *= 0.45;
                launchVy = 0;
                this.tripRotation = 0;
            } else {
                this.state = nextState;
                this.stateTimer = duration;
                this.stateTimerMax = duration;
                if (nextState === 'knockdown') {
                    this.hasBounced = false;
                }
            }
            this.combo++;
            
            fightState.shake = shakeForce;
            fightState.hitStop = hitStopFrs;
            
            // Binary blood spray + corporate brand particles (shooting away from the attacker)
            const sprayDirX = -this.dir; 
            createDirectionalBlood(this.x, this.y - 60, '#ff0000', 16, sprayDirX, -0.4);
            createDirectionalBlood(this.x, this.y - 60, this.color, 12, sprayDirX, -0.4);
            
            // Hit sparks
            fightState.sparks.push({ x: this.x, y: this.y - 60, life: 1, dir: this.dir });
            
            // Apply pushback modifications
            if (vend === 'deepseek' && this.currentExpert === 'contain') {
                kb *= 0.5;
            }
            if (this.isMoE && this.activeExperts && this.activeExperts.some(e => e.includes("Stun"))) {
                kb *= 0.4;
            }
            
            this.vx = -this.dir * kb;
            if (launchVy !== 0) {
                this.vy = launchVy;
            }
            
            // Drop weapon
            if (this.weapon) {
                this.weapon.x = this.x; this.weapon.y = this.y - 50; this.weapon.vy = -300;
                fightState.weapons.push(this.weapon);
                this.weapon = null;
            }
            
            // Context Eviction: Google models lose context tokens
            if (vend === 'google') {
                this.contextTokens = Math.max(0, this.contextTokens - 250000);
            }
            
            // Compressive Ki generation: DeepSeek gains 5 Ki instead of 2
            const kiGain = (vend === 'deepseek') ? 5 : 2;
            this.ki += kiGain;
            if(this.ki > this.maxKi) this.ki = this.maxKi;
        }
        
        let actualDmg = Math.max(1, dmg - (this.defBase * 0.2));
        
        // --- Claude Censor Damage Cap (15% of max HP) ---
        if (vend === 'anthropic' && !unblockable) {
            if (actualDmg > this.maxHp * 0.15) {
                actualDmg = this.maxHp * 0.15;
                createParticles(this.x, this.y - 60, '#FFE082', 10, true);
            }
        }
        
        this.hp -= actualDmg;
        
        if(this.hp <= 0) {
            this.hp = 0;
            
            // Trigger slow-motion for the final blow!
            fightState.slowMoTimer = 1.2;
            
            this.state = 'dizzy';
            this.stateTimer = 270;
            this.stateTimerMax = 270;
            this.vx = -this.dir * 180;
            this.vy = -120;
            this.tripRotation = 0;
            
            fightState.finishThemTimer = 150;
            Audio.ko();
            
            // --- Release opponent on KO/Dizzy ---
            const opponent = this.isPlayer ? fightState.p2 : fightState.p1;
            if (opponent) {
                if (opponent.state === 'grabbed') {
                    opponent.state = 'idle';
                    opponent.vy = 0;
                }
                if (opponent.state === 'throwing') {
                    opponent.state = 'idle';
                }
            }
        }
    }

    render(ctx, isAfterimage = false) {
        if (this.wasVaporized) return;
        
        // Draw lagged afterimages for MoE/LimitBreak motion blur
        if (!isAfterimage && (this.isMoE || this.isLimitBroken) && Math.abs(this.vx) > 30) {
            // Far ghost
            ctx.save();
            ctx.translate(-this.vx * 0.05, 0);
            ctx.globalAlpha = 0.15;
            this.render(ctx, true);
            ctx.restore();
            
            // Near ghost
            ctx.save();
            ctx.translate(-this.vx * 0.025, 0);
            ctx.globalAlpha = 0.3;
            this.render(ctx, true);
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.dir, 1);
        
        // --- DBZ Limit Break Golden Aura Glow ---
        if (this.isLimitBroken) {
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 18;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        // --- Meta 405B Visual Scale-up ---
        if (this.data && this.data.vendor && this.data.vendor.toLowerCase() === 'meta' && this.metaCurrentSize === '405B') {
            ctx.scale(1.22, 1.22);
        }
        
        // Dynamic Drop Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        let shadowScale = Math.max(0, 1 - ((GROUND_Y - this.y) / 200));
        ctx.ellipse(0, GROUND_Y - this.y, 26 * shadowScale, 7 * shadowScale, 0, 0, Math.PI*2);
        ctx.fill();

        // 1. Beautiful pulsing background aura (drawn behind limbs, no slow shadowBlur per stroke)
        const isSuperState = this.isMoE || this.state === 'moe_transform' || this.state === 'charge' || this.ki >= 100;
        if (this.tier >= 4 || isSuperState) {
            ctx.save();
            const auraY = -72;
            const baseRad = this.tier === 5 ? 46 : 36;
            const pulse = 1.0 + Math.sin(this.animTime * 8) * 0.12;
            const auraRad = baseRad * pulse;
            
            // Concentric flickering layers (rising flames)
            for (let i = 0; i < 3; i++) {
                ctx.save();
                const scaleY = 1.2 + Math.sin(this.animTime * 12 + i * 4) * 0.15;
                const scaleX = 0.85 + Math.cos(this.animTime * 10 + i * 3) * 0.1;
                const wobble = Math.sin(this.animTime * 6 + i * 5) * 6;
                
                const radGrad = ctx.createRadialGradient(wobble, auraY - i * 12, 2, wobble, auraY - i * 12, auraRad * (1 - i * 0.25));
                let alpha = isSuperState ? (i === 0 ? '44' : i === 1 ? '2a' : '12') : (i === 0 ? '22' : i === 1 ? '13' : '08');
                if (this.state === 'moe_transform') alpha = i === 0 ? '77' : i === 1 ? '44' : '22';
                
                radGrad.addColorStop(0, this.color + alpha);
                radGrad.addColorStop(0.5, this.color + '15');
                radGrad.addColorStop(1, 'rgba(0,0,0,0)');
                
                ctx.fillStyle = radGrad;
                ctx.beginPath();
                ctx.ellipse(wobble, auraY - i * 12, auraRad * scaleX * (1 - i * 0.22), auraRad * scaleY * (1 - i * 0.16), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            
            if (this.tier === 5 || isSuperState) {
                // soft pulsing outer ring
                ctx.strokeStyle = this.color + '26';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(0, auraY, auraRad * 0.55 * pulse, auraRad * 0.95 * pulse, 0, 0, Math.PI*2);
                ctx.stroke();
            }
            ctx.restore();
            
            // Spawn particles
            if (Math.random() < 0.15 && fightState.active) {
                createParticles(this.x + (Math.random()-0.5)*30, this.y - Math.random()*100, this.color, 1, true);
            }
        }

        // --- IK Core Logic ---
        const t = this.animTime * 10;
        let p = 0, ease = 0, easeOut = 0, easeIn = 0, attackEase = 0;
        if (this.stateTimerMax > 0 && this.state !== 'ko') {
            p = 1 - (this.stateTimer / this.stateTimerMax);
            ease = Math.sin(p * Math.PI);
            easeOut = Math.sin(p * Math.PI / 2);
            easeIn = 1 - Math.cos(p * Math.PI / 2);
            
            // Custom Snappy Attack Curve (SF Hadouken / punch startup-hold-recover)
            if (p < 0.22) {
                attackEase = Math.pow(p / 0.22, 2); // Explode outwards
            } else if (p < 0.45) {
                attackEase = 1.0; // Hold hit active
            } else {
                attackEase = Math.max(0, 1 - (p - 0.45) / 0.55); // Slow retrieval
            }
        }

        // Limb lengths
        const armL1 = 28, armL2 = 26;
        const legL1 = 30, legL2 = 28;
        
        // Upper body lag (secondary motion)
        const lagX = (this.chestLag || 0) * 28;
        let shX = lagX, shY = -90; // Shoulders sway dynamically
        let hipOffset = 0;
        if (this.state === 'hit') {
            hipOffset = -14 * ease;
        }
        const hpX = hipOffset, hpY = -55;     // Hips sway on hit/impact

        // Base joint positions (Shoulders & Hips)
        let bobY = 0;
        if(this.state === 'idle') bobY = Math.sin(t * 0.7) * 3.5;
        if(this.state === 'walk') bobY = Math.abs(Math.sin(t*1.5)) * 4.5;
        if(this.state === 'jump') bobY = 4;
        if(this.state === 'land') bobY = -12; // Landing squash frame!
        let crouchActive = false;
        if((this.state === 'idle' || this.state === 'block') && AIEngine.Input.isActionActive('crouch') && this.isPlayer && this.y >= GROUND_Y) {
            bobY = -24;
            crouchActive = true;
        }
        
        ctx.translate(0, -bobY);

        // Default effectors — arms hang naturally at sides, legs nearly straight
        let handFront = {x: 12 + lagX, y: -38};
        let handBack  = {x: -12 + lagX, y: -38};
        let footFront = {x: 14, y: bobY}; // Planted on floor
        let footBack  = {x: -14, y: bobY}; // Planted on floor
        let spineTilt = 0;

        // Dynamic Leaning: tilt spine based on movement direction relative to facing
        if (this.state === 'walk' && Math.abs(this.vx) > 20) {
            const movingForward = (this.vx > 0 && this.dir === 1) || (this.vx < 0 && this.dir === -1);
            spineTilt = movingForward ? 0.12 : -0.08; // Lean forward or lean back defensively
        }
        if (this.state === 'jump') {
            spineTilt = (this.vx * this.dir > 0) ? 0.08 : -0.05;
        }

        // Animations adjusting IK targets
        if(crouchActive) {
            // Crouch guard pose
            spineTilt = 0.28;
            handFront = {x: 18 + lagX, y: -58};
            handBack  = {x: 4 + lagX, y: -50};
            footFront = {x: 25, y: bobY};
            footBack  = {x: -22, y: bobY};
        }
        else if(this.state === 'idle') {
            // Boxing guard pose
            handFront = {x: 20 + lagX, y: -72 + Math.sin(t*0.7)*2.5};
            handBack  = {x: 6 + lagX, y: -62 + Math.sin(t*0.7+1)*2};
            footFront = {x: 18, y: bobY};
            footBack  = {x: -16, y: bobY};
        }
        else if(this.state === 'walk') {
            const sw = Math.sin(t*1.5);
            handFront.x = 12 + lagX + sw * 14;  handFront.y = -38 - Math.abs(sw)*10;
            handBack.x  = -12 + lagX - sw * 14; handBack.y  = -38 - Math.abs(sw)*10;
            footFront.x = 14 + sw * 14;  footFront.y = bobY - Math.max(0, sw*11);
            footBack.x  = -14 - sw * 14; footBack.y = bobY - Math.max(0, -sw*11);
        }
        else if(this.state === 'jump') {
            handFront.y = -110; handBack.y = -110; // arms up
            footFront.y = -15 + bobY; footFront.x = 16;
            footBack.y  = -25 + bobY; footBack.x  = -20;  // legs tucked
        }
        else if(this.state === 'land') {
            // Crouched landing frame
            handFront = {x: 18 + lagX, y: -50}; handBack = {x: -5 + lagX, y: -45};
            footFront = {x: 20, y: bobY};
            footBack  = {x: -18, y: bobY};
            spineTilt = 0.22;
        }
        else if(this.state === 'block') {
            handFront = {x: 18 + lagX, y: -95}; handBack = {x: 10 + lagX, y: -75};
            spineTilt = 0.18;
            footFront = {x: 16, y: bobY};
            footBack  = {x: -14, y: bobY};
        }
        else if(this.state === 'hit') {
            spineTilt = -0.38 * ease; // Heavier spine recoil arch back
            handFront = {x: -18 * ease + lagX, y: -105 - ease * 15}; // arms recoil up/back
            handBack  = {x: -30 * ease + lagX, y: -85 - ease * 12};
            footFront = {x: 18, y: bobY};
            footBack  = {x: -10, y: bobY};
        }
        else if (this.state === 'grabbed') {
            const opponent = this.isPlayer ? fightState.p2 : fightState.p1;
            if (opponent && opponent.state === 'throwing') {
                const oppP = 1 - Math.max(0, Math.min(1, opponent.stateTimer / 40));
                if (oppP < 0.35) {
                    spineTilt = 0.52;
                    handFront = {x: 8, y: -25}; handBack = {x: -8, y: -20};
                    footFront = {x: 10, y: bobY};
                    footBack = {x: -10, y: bobY};
                } else {
                    const throwPct = (oppP - 0.35) / 0.65;
                    spineTilt = 0.52 + throwPct * Math.PI; // Spin head-first suplex!
                    handFront = {x: -12, y: -90}; handBack = {x: -22, y: -80};
                    footFront = {x: 18, y: bobY};
                    footBack = {x: -12, y: bobY};
                }
            } else {
                spineTilt = 0.4;
                handFront = {x: 10, y: -30}; handBack = {x: -10, y: -25};
            }
        }
        else if (this.state === 'dizzy' || this.state === 'fatality_victim') {
            const sway = Math.sin(this.animTime * 3.5) * 0.28;
            spineTilt = sway;
            handFront = {x: 10 + sway * 15, y: -45};
            handBack  = {x: -12 + sway * 15, y: -45};
            footFront = {x: 14, y: bobY};
            footBack  = {x: -10, y: bobY};
            shY += 5; // slouched head
        }
        else if (this.state === 'fatality_active') {
            if (this.stateTimer <= 120) {
                // Epic Victory pose
                spineTilt = -0.15;
                handFront = {x: 28, y: -110};
                handBack  = {x: -22, y: -105};
                footFront = {x: 22, y: bobY};
                footBack  = {x: -20, y: bobY};
            } else {
                // Walking/startup pose
                spineTilt = 0.08;
                handFront = {x: 26, y: -75};
                handBack  = {x: 10, y: -65};
                footFront = {x: 16, y: bobY};
                footBack  = {x: -14, y: bobY};
            }
        }
        if (this.state === 'ko' || this.state === 'knockdown') {
            spineTilt = -Math.PI / 2;
            ctx.translate(0, 40);
            
            // Lying flat pose target coordinates
            handFront = {x: 18, y: -5};
            handBack  = {x: 10, y: -8};
            footFront = {x: 52, y: 12};
            footBack  = {x: 46, y: 15};
        }
        else if (this.state === 'get_up') {
            const getUpProgress = 1 - (this.stateTimer / this.stateTimerMax); // 0 to 1
            spineTilt = (-Math.PI / 2) * (1 - getUpProgress);
            ctx.translate(0, 40 * (1 - getUpProgress));
            
            // Interpolate limbs from flat to idle guard pose
            const flatHandFront = {x: 18, y: -5};
            const idleHandFront = {x: 20 + lagX, y: -72 + Math.sin(t*0.7)*2.5};
            handFront = {
                x: flatHandFront.x + (idleHandFront.x - flatHandFront.x) * getUpProgress,
                y: flatHandFront.y + (idleHandFront.y - flatHandFront.y) * getUpProgress
            };
            
            const flatHandBack = {x: 10, y: -8};
            const idleHandBack = {x: 6 + lagX, y: -62 + Math.sin(t*0.7+1)*2};
            handBack = {
                x: flatHandBack.x + (idleHandBack.x - flatHandBack.x) * getUpProgress,
                y: flatHandBack.y + (idleHandBack.y - flatHandBack.y) * getUpProgress
            };
            
            const flatFootFront = {x: 52, y: 12};
            const idleFootFront = {x: 18, y: bobY};
            footFront = {
                x: flatFootFront.x + (idleFootFront.x - flatFootFront.x) * getUpProgress,
                y: flatFootFront.y + (idleFootFront.y - flatFootFront.y) * getUpProgress
            };
            
            const flatFootBack = {x: 46, y: 15};
            const idleFootBack = {x: -16, y: bobY};
            footBack = {
                x: flatFootBack.x + (idleFootBack.x - flatFootBack.x) * getUpProgress,
                y: flatFootBack.y + (idleFootBack.y - flatFootBack.y) * getUpProgress
            };
        }
        
        // Apply sweep/trip rotation if active during hitstun
        if (this.tripRotation && this.state === 'hit') {
            spineTilt = this.tripRotation;
        }
        
        if(this.state === 'attack') {
            const mv = this.currentMove;
            let antEase = easeOut < 0.2 ? -easeOut : 0;
            
            if (mv === 'crouch_punch') { // UPPERCUT!
                // Arm swings in a vertical arc from low hip up past the head
                handFront.x = 10 + 20 * attackEase;
                handFront.y = -45 - 75 * attackEase;
                handBack.x = -18; handBack.y = -75;
                spineTilt = -0.32 * attackEase; // Lean back heavily throwing weight up
                footFront = {x: 22, y: bobY};
                footBack  = {x: -20, y: bobY};
            }
            else if (mv === 'crouch_kick') { // SWEEP!
                // Kick low along the ground
                footFront.x = 14 + 75 * attackEase + (antEase * 12);
                footFront.y = bobY; // Keep it low!
                handFront = {x: -10, y: -50};
                handBack = {x: -18, y: -45};
                spineTilt = -0.25 * attackEase; // Lean back
                footBack  = {x: -24, y: bobY};
            }
            else if (mv === 'fwd_kick') { // ROUNDHOUSE!
                // High side kick
                footFront.x = 14 + 75 * attackEase + (antEase * 12);
                footFront.y = -75 * attackEase + bobY; // High kick
                handFront = {x: -12, y: -70};
                handBack = {x: -20, y: -65};
                spineTilt = -0.35 * attackEase; // Lean back for balance
                footBack  = {x: -18, y: bobY};
            }
            else if (mv === 'jump_kick') { // JUMP KICK!
                // Extended kick down-forward in air, body tilted
                spineTilt = 0.5; // Rotate body forward
                footFront.x = 22 + 65 * attackEase;
                footFront.y = -15 + bobY;
                footBack  = {x: -20, y: -38 + bobY}; // Tucked back leg
                handFront = {x: -12, y: -90};
                handBack = {x: -22, y: -80};
            }
            else if (mv === 'jump_punch') { // JUMP PUNCH!
                // Punch downward
                spineTilt = 0.4;
                handFront.x = 15 + 50 * attackEase;
                handFront.y = -50 + 35 * attackEase; // Strike down
                handBack = {x: -10, y: -85};
                footFront = {x: 16, y: -15 + bobY};
                footBack = {x: -20, y: -25 + bobY};
            }
            else if(mv.includes('punch')) {
                // Punch: snap front hand forward using attackEase, back hand protects chest
                handFront.x = 12 + 58 * attackEase + (antEase * 12);
                handFront.y = -72;
                handBack.x = -10; handBack.y = -62;
                spineTilt = 0.18 * attackEase;
                footFront = {x: 18, y: bobY};
                footBack  = {x: -14, y: bobY};
            }
            else if(mv.includes('kick')) {
                // Kick: snap front foot forward using attackEase, lean back
                footFront.x = 14 + 65 * attackEase + (antEase * 12);
                footFront.y = -52 * attackEase + bobY;
                handFront.x = -8; handFront.y = -60;
                spineTilt = -0.15 * attackEase;
                footBack  = {x: -16, y: bobY};
            }
            else if(mv === 'special') {
                const vendor = this.data.vendor.toLowerCase();
                // Special attack poses matching SF specials
                if(vendor === 'google' || vendor === 'openai') {
                    // Palm blast (Hadouken stance): both arms straight forward
                    handFront.x = 12 + 54 * attackEase; handFront.y = -70;
                    handBack.x  = -12 + 48 * attackEase; handBack.y  = -70;
                    spineTilt = 0.22 * attackEase;
                } else if(vendor === 'anthropic' || vendor === 'mistral') {
                    // Sword Slash: sweeping slash with front arm
                    handFront.x = 15 + 45 * attackEase; handFront.y = -105 + 60 * attackEase;
                    handBack.x = -15; handBack.y = -45;
                    spineTilt = 0.28 * attackEase;
                } else { // meta, deepseek, others
                    // Stomp / Lunge: body lunges forward, front foot stomps down
                    ctx.translate(32 * attackEase, 0);
                    footFront.x = 14 + 45 * attackEase; footFront.y = -52 * attackEase + bobY;
                    spineTilt = -0.18 * attackEase;
                    footBack  = {x: -18, y: bobY};
                }
            }
            else if(this.currentMove === 'grab') {
                handFront.x = 52 * easeOut; handFront.y = -88;
                handBack.x  = 52 * easeOut; handBack.y  = -88;
            }
            else if(this.currentMove === 'ranged') {
                // HADOUKEN push
                handFront.x = 45 * easeOut; handFront.y = -75;
                handBack.x  = 40 * easeOut; handBack.y  = -75;
                spineTilt = 0.15 * easeOut;
            }
            else if(this.currentMove === 'pickup') {
                handFront.x = 22 * ease; handFront.y = -30;
                spineTilt = 0.38 * ease;
            }
            else if(this.currentMove === 'throw_weapon') {
                handFront.x = -20 + (65 * ease); handFront.y = -110 + (45 * ease);
            }
        }
        
        if(this.state === 'throwing') {
            const throwP = 1 - Math.max(0, Math.min(1, this.stateTimer / 40));
            if (throwP < 0.35) {
                // Grab phase: reach forward
                handFront = {x: 32, y: -65};
                handBack  = {x: 24, y: -60};
                spineTilt = 0.18; // Lean forward
            } else {
                // Suplex swing phase: arch back and throw hands overhead behind
                const throwPct = (throwP - 0.35) / 0.65;
                handFront = {x: 24 - 56 * throwPct, y: -65 - 50 * throwPct};
                handBack  = {x: 18 - 48 * throwPct, y: -60 - 45 * throwPct};
                spineTilt = 0.18 - 0.64 * throwPct; // Heavy back arch suplex
            }
        }

        // Apply spine tilt to shoulders/hips
        ctx.rotate(spineTilt);

        // Solve IK
        let fArm = solveIK(shX, shY, handFront.x, handFront.y, armL1, armL2, false);
        let bArm = solveIK(shX, shY, handBack.x, handBack.y, armL1, armL2, false);
        let fLeg = solveIK(hpX, hpY, footFront.x, footFront.y, legL1, legL2, true);
        let bLeg = solveIK(hpX, hpY, footBack.x, footBack.y, legL1, legL2, true);

        // ─── SHARED RENDERING HELPERS ─────────────────────────────
        let col = this.color;
        const hexShift = (h, a) => {
            const s=(v)=>Math.min(255,Math.max(0,v+a)).toString(16).padStart(2,'0');
            return '#'+s(parseInt(h.slice(1,3),16))+s(parseInt(h.slice(3,5),16))+s(parseInt(h.slice(5,7),16));
        };
        let cLight=hexShift(col,85), cDark=hexShift(col,-75), cVDark=hexShift(col,-140);
        
        if (this.hitFlashTimer > 0) {
            const flashColor = (this.state === 'block') ? '#ffffff' : '#eb0a0a';
            col = flashColor;
            cLight = flashColor;
            cDark = flashColor;
            cVDark = flashColor;
        }

        // Filled capsule path from (x1,y1) to (x2,y2) with radius r (uses current transform)
        const capsulePath=(x1,y1,x2,y2,r)=>{
            const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);
            if(len<0.5)return;
            ctx.save(); ctx.translate((x1+x2)/2,(y1+y2)/2); ctx.rotate(Math.atan2(dy,dx));
            ctx.beginPath(); ctx.roundRect(-len/2,-r,len,r*2,r);
            ctx.restore();
        };

        // Tapered shape (trapezoid + rounded caps) from (x1,y1,r1) to (x2,y2,r2)
        const taperPath=(x1,y1,r1,x2,y2,r2)=>{
            const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);
            if(len<0.5)return;
            const nx=-dy/len,ny=dx/len;
            ctx.beginPath();
            ctx.moveTo(x1+nx*r1,y1+ny*r1);
            ctx.lineTo(x2+nx*r2,y2+ny*r2);
            ctx.arc(x2,y2,r2,Math.atan2(ny,nx),Math.atan2(-ny,-nx),false);
            ctx.lineTo(x1-nx*r1,y1-ny*r1);
            ctx.arc(x1,y1,r1,Math.atan2(-ny,-nx),Math.atan2(ny,nx),false);
            ctx.closePath();
        };

        // Perpendicular gradient across a limb segment
        const limbGrad=(x1,y1,x2,y2,r,c0,c1,c2)=>{
            const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);
            if(len<0.5)return col;
            const nx=-dy/len,ny=dx/len,mx=(x1+x2)/2,my=(y1+y2)/2;
            const g=ctx.createLinearGradient(mx+nx*r,my+ny*r,mx-nx*r,my-ny*r);
            g.addColorStop(0,c0); g.addColorStop(0.42,c1); g.addColorStop(1,c2);
            return g;
        };

        // Draw uniform capsule limb (dimmed = back/occluded)
        const limb=(x1,y1,x2,y2,r,dimmed=false)=>{
            ctx.save();
            if(dimmed) ctx.globalAlpha=0.48;
            capsulePath(x1,y1,x2,y2,r);
            ctx.fillStyle=limbGrad(x1,y1,x2,y2,r,cLight,col,cDark);
            ctx.strokeStyle=this.tier===5?'rgba(255,255,255,0.14)':'rgba(0,0,0,0.25)';
            ctx.lineWidth=1; ctx.fill(); ctx.stroke();
            ctx.restore();
        };

        // Draw tapered limb (wider at start, dimmed = back/occluded)
        const tapLimb=(x1,y1,r1,x2,y2,r2,dimmed=false)=>{
            ctx.save();
            if(dimmed) ctx.globalAlpha=0.48;
            taperPath(x1,y1,r1,x2,y2,r2);
            const r=Math.max(r1,r2);
            ctx.fillStyle=limbGrad(x1,y1,x2,y2,r,cLight,col,cDark);
            ctx.strokeStyle=this.tier===5?'rgba(255,255,255,0.14)':'rgba(0,0,0,0.25)';
            ctx.lineWidth=1; ctx.fill(); ctx.stroke();
            ctx.restore();
        };

        const lerpPt=(a,b,f)=>({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f});

        // ─── TIER 1/2/3/4/5: UNIFIED CYBORG BODY SHAPES ────────────────
        const t5 = this.tier === 5, t4 = this.tier === 4;
            
            // Rising matrix digital particles for T5
            if (t5 && Math.random() < 0.28 && fightState.active) {
                fightState.particles.push({
                    x: this.x + (Math.random() - 0.5) * 50,
                    y: this.y - Math.random() * 80,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: -Math.random() * 2 - 1.5,
                    life: 1.0,
                    color: this.color,
                    size: Math.random() * 3 + 2.5,
                    isDigit: true
                });
            }

            const aW = t5 ? 7 : (t4 ? 6 : 5);
            const lW = t5 ? 8 : (t4 ? 7 : 6);
            const tSh = t5 ? 17 : (t4 ? 15 : 13), tHp = t5 ? 13 : (t4 ? 11 : 10);
            const headR = t5 ? 15 : (t4 ? 13 : 12), headY = shY - headR - 4;
            // ─── Visual Attack Smear Trail Ribbon (Street Fighter style) ───
            if (this.state === 'attack' && this.attackTrail && this.attackTrail.length >= 2) {
                ctx.save();
                ctx.restore(); // make sure we're in clean state
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0); // draw in global coordinates
                
                // Draw tapered ribbon segments
                for (let i = 0; i < this.attackTrail.length - 1; i++) {
                    const p1 = this.attackTrail[i];
                    const p2 = this.attackTrail[i+1];
                    const ratio = i / (this.attackTrail.length - 1);
                    
                    // Outer glow
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 15 * ratio;
                    ctx.globalAlpha = 0.28 * ratio;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                    
                    // Inner core
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 5 * ratio;
                    ctx.globalAlpha = 0.65 * ratio;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Record trail points at the end of rendering
            if (this.state === 'attack') {
                const mv = this.currentMove;
                if (mv.includes('punch') || mv.includes('kick')) {
                    const endX = this.x + (mv.includes('punch') ? handFront.x : footFront.x) * this.dir;
                    const endY = this.y - bobY + (mv.includes('punch') ? handFront.y : footFront.y);
                    if (!this.attackTrail) this.attackTrail = [];
                    this.attackTrail.push({x: endX, y: endY});
                    if (this.attackTrail.length > 5) this.attackTrail.shift();
                }
            } else {
                this.attackTrail = [];
            }

            // Unified limb rendering helper
            const drawLimbSegment = (sx, sy, ex, ey, tx, ty, w, dimmed) => {
                ctx.save();
                if(dimmed) ctx.globalAlpha = 0.48;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                // 1. Dark backing outline
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.lineTo(tx, ty);
                ctx.strokeStyle = cDark;
                ctx.lineWidth = w * 2.1;
                ctx.stroke();
                
                // 2. Main body color
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.lineTo(tx, ty);
                ctx.strokeStyle = col;
                ctx.lineWidth = w * 1.7;
                ctx.stroke();
                
                // 3. Highlight sheen line
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.lineTo(tx, ty);
                ctx.strokeStyle = cLight;
                ctx.lineWidth = w * 0.7;
                ctx.stroke();
                
                // Neon flow line for Tier 5 cyborgs
                if (t5) {
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(ex, ey);
                    ctx.lineTo(tx, ty);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.8;
                    ctx.stroke();
                }
                ctx.restore();
            };

            // Custom Shoe/Foot shape drawer
            const drawFoot = (tx, ty, w, dimmed) => {
                ctx.save();
                if(dimmed) ctx.globalAlpha = 0.48;
                ctx.lineCap = 'round';
                
                // Shoe body (fighter theme color)
                ctx.beginPath();
                ctx.moveTo(tx - 3, ty);
                ctx.lineTo(tx + 18, ty);
                ctx.strokeStyle = col;
                ctx.lineWidth = w * 1.7;
                ctx.stroke();
                
                // Shoe sole base (white/highlight at base)
                ctx.beginPath();
                ctx.moveTo(tx - 2, ty + w * 0.75);
                ctx.lineTo(tx + 17, ty + w * 0.75);
                ctx.strokeStyle = t5 ? '#ffffff' : cLight;
                ctx.lineWidth = w * 0.55;
                ctx.stroke();
                
                // T5 neon detail stripe
                if (t5) {
                    ctx.beginPath();
                    ctx.moveTo(tx + 3, ty - w * 0.3);
                    ctx.lineTo(tx + 12, ty - w * 0.3);
                    ctx.strokeStyle = cLight;
                    ctx.lineWidth = 1.6;
                    ctx.stroke();
                }
                ctx.restore();
            };

            // Custom Glove/Hand shape drawer
            const drawHand = (tx, ty, w, dimmed) => {
                ctx.save();
                if(dimmed) ctx.globalAlpha = 0.48;
                
                // Glove outer base
                ctx.beginPath();
                ctx.arc(tx, ty, w * 1.15, 0, Math.PI * 2);
                ctx.fillStyle = cDark;
                ctx.fill();
                
                // Glove knuckle plate (accent color)
                ctx.beginPath();
                ctx.arc(tx, ty, w * 0.85, 0, Math.PI * 2);
                ctx.fillStyle = col;
                ctx.fill();
                
                // Knuckle shine
                if (t4 || t5) {
                    ctx.beginPath();
                    ctx.arc(tx - w * 0.25, ty - w * 0.25, w * 0.4, 0, Math.PI * 2);
                    ctx.fillStyle = cLight;
                    ctx.fill();
                }
                ctx.restore();
            };

            // Custom Vendor Chest Reactor logo drawer
            const drawChestEmblem = (cx, cy, r) => {
                ctx.save();
                // 1. Draw glowing reactor ring
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.fillStyle = col + '48';
                ctx.fill();
                
                // 2. Draw glowing vendor emblem core
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 8;
                ctx.strokeStyle = '#ffffff';
                ctx.fillStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                
                const vend = this.data.vendor.toLowerCase();
                if (vend === 'google') {
                    // Google Gemini Spark Star
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - r * 0.7);
                    ctx.quadraticCurveTo(cx, cy, cx + r * 0.7, cy);
                    ctx.quadraticCurveTo(cx, cy, cx, cy + r * 0.7);
                    ctx.quadraticCurveTo(cx, cy, cx - r * 0.7, cy);
                    ctx.quadraticCurveTo(cx, cy, cx, cy - r * 0.7);
                    ctx.closePath();
                    ctx.fill();
                } else if (vend === 'openai') {
                    // OpenAI flower spiral core
                    ctx.beginPath();
                    ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
                        const px = cx + Math.cos(a) * r * 0.45;
                        const py = cy + Math.sin(a) * r * 0.45;
                        ctx.beginPath();
                        ctx.arc(px, py, r * 0.2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (vend === 'anthropic') {
                    // Anthropic Claude A-frame / organic Prompt slash
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - r * 0.65);
                    ctx.lineTo(cx + r * 0.55, cy + r * 0.5);
                    ctx.lineTo(cx + r * 0.25, cy + r * 0.5);
                    ctx.lineTo(cx, cy - r * 0.15);
                    ctx.lineTo(cx - r * 0.25, cy + r * 0.5);
                    ctx.lineTo(cx - r * 0.55, cy + r * 0.5);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(cx - r * 0.35, cy + r * 0.1);
                    ctx.lineTo(cx + r * 0.35, cy + r * 0.1);
                    ctx.stroke();
                } else if (vend === 'meta') {
                    // Meta infinity dual rings
                    ctx.beginPath();
                    ctx.arc(cx - r * 0.24, cy, r * 0.34, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(cx + r * 0.24, cy, r * 0.34, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (vend === 'mistral') {
                    // Mistral wind-propeller
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(this.animTime * 3.5);
                    ctx.beginPath();
                    for (let i = 0; i < 3; i++) {
                        ctx.rotate((Math.PI * 2) / 3);
                        ctx.moveTo(0, 0);
                        ctx.quadraticCurveTo(r * 0.5, -r * 0.3, r * 0.7, 0);
                    }
                    ctx.stroke();
                    ctx.restore();
                } else {
                    // DeepSeek complex node hexagon
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (i * Math.PI) / 3;
                        const hx = cx + Math.cos(angle) * r * 0.65;
                        const hy = cy + Math.sin(angle) * r * 0.65;
                        if (i === 0) ctx.moveTo(hx, hy);
                        else ctx.lineTo(hx, hy);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            };

            // ── Layer 1: Back Leg & Foot ──
            drawLimbSegment(hpX - 4, hpY, bLeg.ex, bLeg.ey, bLeg.tx, bLeg.ty, lW, true);
            drawFoot(bLeg.tx, bLeg.ty, lW, true);

            // ── Layer 2: Back Arm & Hand ──
            drawLimbSegment(shX - 3, shY, bArm.ex, bArm.ey, bArm.tx, bArm.ty, aW, true);
            drawHand(bArm.tx, bArm.ty, aW, true);

            // ── Layer 3: Torso & Shoulder Pauldrons ──
            if(t5){
                ctx.beginPath();
                ctx.moveTo(shX - tSh, shY);
                ctx.lineTo(shX + tSh, shY);
                ctx.lineTo(hpX + tHp, hpY);
                ctx.lineTo(hpX - tHp, hpY);
                ctx.closePath();
                ctx.fillStyle = col;
                ctx.strokeStyle = 'rgba(255,255,255,0.18)';
                ctx.lineWidth = 1.5;
                ctx.fill(); ctx.stroke();
                
                // Chest highlight plate
                ctx.fillStyle = cLight;
                ctx.beginPath();
                ctx.moveTo(shX - tSh * 0.5, shY + 5);
                ctx.lineTo(shX + tSh * 0.5, shY + 5);
                ctx.lineTo(hpX + tHp * 0.5, hpY - 5);
                ctx.lineTo(hpX - tHp * 0.5, hpY - 5);
                ctx.closePath();
                ctx.fill();

                // Central glowing vendor reactor core (small and sleek)
                drawChestEmblem(shX * 0.37, shY + 22, tHp * 0.52);
            } else {
                ctx.beginPath();
                ctx.moveTo(shX - tSh, shY);
                ctx.lineTo(shX + tSh, shY);
                ctx.lineTo(hpX + tHp, hpY);
                ctx.lineTo(hpX - tHp, hpY);
                ctx.closePath();
                ctx.fillStyle = col;
                if (t4) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                    ctx.lineWidth = 1;
                    ctx.fill(); ctx.stroke();
                    
                    // Central glowing reactor (no emblem for T4, just plain core)
                    drawChestEmblem(shX * 0.37, shY + 22, tHp * 0.42);
                } else {
                    ctx.fill();
                }
            }

            // ── Layer 4: Front Leg & Foot ──
            drawLimbSegment(hpX + 4, hpY, fLeg.ex, fLeg.ey, fLeg.tx, fLeg.ty, lW, false);
            drawFoot(fLeg.tx, fLeg.ty, lW, false);

            // ── Layer 5: Neck & Head (visors / helmet profiles) ──
            if(t5){
                // Neck
                ctx.beginPath();
                ctx.moveTo(shX - 4, shY);
                ctx.lineTo(shX + 4, shY);
                ctx.lineTo(shX, headY + 5);
                ctx.closePath();
                ctx.fillStyle = cDark;
                ctx.fill();
                
                // Cyber Visor Helmet
                const hx = shX, hy = headY;
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(hx - headR * 0.6, hy - headR * 0.8);
                ctx.bezierCurveTo(hx - headR * 0.8, hy - headR * 1.3, hx + headR * 0.7, hy - headR * 1.3, hx + headR * 0.8, hy - headR * 0.3);
                ctx.lineTo(hx + headR * 1.0, hy); // sharp visor nose tip
                ctx.lineTo(hx + headR * 0.6, hy + headR * 0.4); // chin
                ctx.lineTo(hx - headR * 0.6, hy + headR * 0.6); // jaw
                ctx.closePath();
                
                const hg = ctx.createRadialGradient(hx - headR*0.2, hy - headR*0.2, 2, hx, hy, headR);
                hg.addColorStop(0, cLight); hg.addColorStop(0.65, col); hg.addColorStop(1, cDark);
                ctx.fillStyle = hg;
                ctx.strokeStyle = 'rgba(255,255,255,0.22)';
                ctx.lineWidth = 1.5;
                ctx.fill(); ctx.stroke();
                
                // Visor glow line
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(hx + headR * 0.1, hy - headR * 0.25);
                ctx.lineTo(hx + headR * 0.85, hy - headR * 0.15);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();

                // ── Helmet Tech Accessories (Horns / fins / crests for T5) ──
                ctx.save();
                ctx.shadowColor = cLight;
                ctx.shadowBlur = 8;
                ctx.fillStyle = cLight;
                ctx.strokeStyle = cLight;
                ctx.lineWidth = 2;
                
                const vend = this.data.vendor.toLowerCase();
                if (vend === 'google') {
                    // Google Spark halo star
                    const sx = hx, sy = hy - headR * 1.5;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - 6);
                    ctx.quadraticCurveTo(sx, sy, sx + 6, sy);
                    ctx.quadraticCurveTo(sx, sy, sx, sy + 6);
                    ctx.quadraticCurveTo(sx, sy, sx - 6, sy);
                    ctx.quadraticCurveTo(sx, sy, sx, sy - 6);
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.ellipse(sx, sy + 2, 7, 2, 0, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (vend === 'openai') {
                    // Twin tech fins/antennae
                    ctx.beginPath();
                    ctx.moveTo(hx - headR * 0.5, hy - headR * 0.9);
                    ctx.lineTo(hx - headR * 1.4, hy - headR * 1.4);
                    ctx.lineTo(hx - headR * 0.9, hy - headR * 0.7);
                    ctx.closePath();
                    ctx.fill();
                } else if (vend === 'anthropic') {
                    // Sweeping organic horns
                    ctx.beginPath();
                    ctx.moveTo(hx + headR * 0.2, hy - headR * 0.9);
                    ctx.quadraticCurveTo(hx - headR * 0.8, hy - headR * 1.5, hx - headR * 1.65, hy - headR * 0.95);
                    ctx.quadraticCurveTo(hx - headR * 0.8, hy - headR * 1.1, hx + headR * 0.15, hy - headR * 0.8);
                    ctx.closePath();
                    ctx.fill();
                } else if (vend === 'meta') {
                    // Tech llama ears/fins
                    ctx.beginPath();
                    ctx.moveTo(hx - headR * 0.4, hy - headR * 1.0);
                    ctx.lineTo(hx - headR * 0.6, hy - headR * 1.7);
                    ctx.lineTo(hx - headR * 0.1, hy - headR * 1.1);
                    ctx.closePath();
                    ctx.fill();
                } else if (vend === 'mistral') {
                    // Wind crest fin
                    ctx.beginPath();
                    ctx.moveTo(hx + headR * 0.4, hy - headR * 1.0);
                    ctx.quadraticCurveTo(hx - headR * 0.5, hy - headR * 1.6, hx - headR * 1.35, hy - headR * 1.12);
                    ctx.lineTo(hx - headR * 0.5, hy - headR * 0.8);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // DeepSeek Hex crown
                    ctx.beginPath();
                    ctx.moveTo(hx - headR * 0.4, hy - headR * 1.1);
                    ctx.lineTo(hx - headR * 0.6, hy - headR * 1.4);
                    ctx.lineTo(hx, hy - headR * 1.3);
                    ctx.lineTo(hx + headR * 0.25, hy - headR * 1.52);
                    ctx.lineTo(hx + headR * 0.35, hy - headR * 1.1);
                    ctx.stroke();
                }
                ctx.restore();
            } else if(t4){
                const hx = shX, hy = headY;
                ctx.save();
                ctx.beginPath();
                ctx.arc(hx, hy, headR, 0, Math.PI*2);
                ctx.fillStyle = cDark;
                ctx.fill();
                
                // Visor strip
                ctx.strokeStyle = cLight;
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.moveTo(hx - headR * 0.6, hy - headR * 0.2);
                ctx.lineTo(hx + headR * 0.8, hy - headR * 0.2);
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.fillStyle=col; ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1;
                ctx.beginPath(); ctx.arc(shX,headY,headR,0,Math.PI*2); ctx.fill(); ctx.stroke();
            }

            // ── Layer 6: Front Arm & Hand ──
            drawLimbSegment(shX + 3, shY, fArm.ex, fArm.ey, fArm.tx, fArm.ty, aW, false);
            drawHand(fArm.tx, fArm.ty, aW, false);

            ctx.shadowBlur=0;
        
        // --- Draw custom vendor indicators (Safety alignment barrier) ---
        if (this.state !== 'ko') {
            const vend = this.data && this.data.vendor ? this.data.vendor.toLowerCase() : '';
            if (vend === 'openai' && (this.safetyTimer || 0) > 0) {
                ctx.save();
                ctx.strokeStyle = 'rgba(16, 163, 127, 0.65)';
                ctx.lineWidth = 1.8;
                ctx.shadowColor = '#10A37F';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3 + this.animTime * 2.5;
                    const sx = shX + Math.cos(angle) * 34;
                    const sy = (shY + 22) + Math.sin(angle) * 34;
                    if (i === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            }
        }

        // Draw Held Weapon
        if (this.weapon) {
            ctx.save();
            ctx.translate(fArm.tx, fArm.ty);
            ctx.rotate(spineTilt + (this.state === 'attack' ? p * 2 : 0));
            this.weapon.x = 0; this.weapon.y = 0; // Local draw
            this.weapon.render(ctx);
            ctx.restore();
        }

        // --- FATALITY CINEMATIC EFFECTS ---
        if (this.state === 'fatality_active') {
            const opp = this.isPlayer ? fightState.p2 : fightState.p1;
            if (opp) {
                const progress = 240 - this.stateTimer;
                const oppRelX = opp.x - this.x;
                const oppRelY = opp.y - this.y;
                const vend = this.data && this.data.vendor ? this.data.vendor.toLowerCase() : '';
                
                ctx.save();
                
                // 1. Draw Fatality-specific graphics
                if (progress > 60 && progress < 120) {
                    // Google: Context Eviction Vortex
                    if (vend === 'google') {
                        // Multi-color context beam columns (Google brand palette)
                        const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
                        ctx.globalAlpha = 0.65;
                        for (let i = 0; i < 4; i++) {
                            const width = 28 + Math.sin(this.animTime * 15 + i) * 6;
                            const bx = oppRelX - 30 + i * 20;
                            ctx.fillStyle = colors[i];
                            ctx.fillRect(bx - width/2, -350, width, 350 + oppRelY);
                        }
                        ctx.globalAlpha = 1.0;
                        
                        // Swirling binary code cyclone
                        ctx.fillStyle = '#00f0ff';
                        ctx.font = 'bold 9px "Share Tech Mono", monospace';
                        for (let i = 0; i < 28; i++) {
                            const angle = i * 0.28 + this.animTime * 6.5;
                            const dist = 16 + i * 2.2;
                            const codeX = oppRelX + Math.cos(angle) * dist;
                            const codeY = (oppRelY - 95) + Math.sin(angle) * dist * 0.65 + (i * 2.5);
                            ctx.fillText(Math.random() > 0.5 ? '1' : '0', codeX, codeY);
                        }
                    }
                    // OpenAI: Alignment Censorship Hexagonal Override
                    else if (vend === 'openai') {
                        // Giant black Censored bar
                        ctx.fillStyle = '#0a0a0a';
                        ctx.strokeStyle = '#ff3366';
                        ctx.lineWidth = 3.5;
                        ctx.shadowColor = '#ff0033';
                        ctx.shadowBlur = 15;
                        ctx.fillRect(oppRelX - 90, oppRelY - 90, 180, 52);
                        ctx.strokeRect(oppRelX - 90, oppRelY - 90, 180, 52);
                        ctx.shadowBlur = 0;
                        
                        ctx.fillStyle = '#ff2255';
                        ctx.font = '900 10px monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('[ POLICY VIOLATION: REDACTED ]', oppRelX, oppRelY - 64);
                        
                        // Concentric alignment hexagons closing in
                        ctx.strokeStyle = 'rgba(16, 163, 127, 0.7)';
                        ctx.lineWidth = 2;
                        const hexCount = 3;
                        for (let h = 0; h < hexCount; h++) {
                            const size = 65 - (progress - 60) * 0.9 - h * 12;
                            if (size > 5) {
                                ctx.beginPath();
                                for (let i = 0; i < 6; i++) {
                                    const angle = (i * Math.PI) / 3 + this.animTime * 2.8 + h;
                                    const hx = oppRelX + Math.cos(angle) * size;
                                    const hy = (oppRelY - 50) + Math.sin(angle) * size;
                                    if (i === 0) ctx.moveTo(hx, hy);
                                    else ctx.lineTo(hx, hy);
                                }
                                ctx.closePath();
                                ctx.stroke();
                            }
                        }
                    }
                    // Anthropic: Constitutional Erasure Blade
                    else if (vend === 'anthropic') {
                        // Golden prompt constitution grid lines
                        ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
                        ctx.lineWidth = 1;
                        for (let i = -4; i <= 4; i++) {
                            ctx.beginPath();
                            ctx.moveTo(oppRelX - 250, oppRelY - 50 + i * 20);
                            ctx.lineTo(oppRelX + 250, oppRelY - 50 + i * 20);
                            ctx.stroke();
                        }
                        
                        // Sweeping golden blade shockwave
                        const bladeProgress = (progress - 60) / 60; // 0 to 1
                        const sweepRadius = bladeProgress * 180;
                        ctx.strokeStyle = '#D97706';
                        ctx.lineWidth = 6;
                        ctx.shadowColor = '#FFE082';
                        ctx.shadowBlur = 20;
                        ctx.beginPath();
                        ctx.arc(0, -60, sweepRadius, -Math.PI/4, Math.PI/4);
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                        
                        // Golden constitutional clause particles floating up
                        ctx.fillStyle = '#FFE082';
                        ctx.font = 'bold 8px monospace';
                        ctx.fillText('RULE_1: BENEVOLENT', oppRelX - 40, oppRelY - 110 - Math.sin(this.animTime*5)*10);
                        ctx.fillText('RULE_2: TRUSTWORTHY', oppRelX + 30, oppRelY - 70 - Math.cos(this.animTime*5)*10);
                    }
                    // Meta: Llama Parameter Stampede
                    else if (vend === 'meta') {
                        ctx.strokeStyle = '#0467DF';
                        ctx.lineWidth = 2.2;
                        
                        // Wave of charging wireframe llamas
                        for (let k = 0; k < 6; k++) {
                            const waveOffset = k * 52;
                            const stampedeX = -250 + (progress - 60) * 16 - waveOffset;
                            const llamaY = oppRelY - 10 + Math.sin(this.animTime * 14 + k) * 10;
                            
                            ctx.save();
                            ctx.translate(stampedeX, llamaY);
                            ctx.beginPath();
                            ctx.moveTo(-15, 8);
                            ctx.lineTo(-15, -6);
                            ctx.lineTo(-8, -20); // neck
                            ctx.lineTo(-11, -26); // ears
                            ctx.lineTo(-7, -26);
                            ctx.lineTo(-3, -20);
                            ctx.lineTo(8, -20); // snout
                            ctx.lineTo(8, -13);
                            ctx.lineTo(1, -11);
                            ctx.lineTo(-3, 8);
                            ctx.closePath();
                            ctx.stroke();
                            ctx.restore();
                        }
                    }
                    // Mistral: GQA Sliding Window Decimation Tornado
                    else if (vend === 'mistral') {
                        ctx.strokeStyle = '#FF7000';
                        ctx.lineWidth = 2.5;
                        ctx.shadowColor = '#FF7000';
                        ctx.shadowBlur = 10;
                        
                        const rad = Math.max(5, 110 - (progress - 60) * 2.0);
                        
                        // 8 converging spinning wind-shears
                        for (let i = 0; i < 8; i++) {
                            const angle = (i * Math.PI) / 4 + this.animTime * 8;
                            const cx = oppRelX + Math.cos(angle) * rad;
                            const cy = (oppRelY - 50) + Math.sin(angle) * rad;
                            
                            ctx.save();
                            ctx.translate(cx, cy);
                            ctx.rotate(this.animTime * 15);
                            ctx.beginPath();
                            ctx.arc(0, 0, 10, -Math.PI/3, Math.PI/3);
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.arc(0, 0, 10, Math.PI - Math.PI/3, Math.PI + Math.PI/3);
                            ctx.stroke();
                            ctx.restore();
                        }
                        ctx.shadowBlur = 0;
                    }
                    // DeepSeek: Multi-Token Deletion Helix & Math Rain
                    else if (vend === 'deepseek') {
                        // Double helix wrapping around the victim
                        ctx.strokeStyle = '#00f0ff';
                        ctx.lineWidth = 1.8;
                        ctx.fillStyle = '#1E40AF';
                        const mathSymbols = ['+', '-', '×', '∑', '∫', 'π', '√', 'λ'];
                        
                        for (let i = 0; i < 7; i++) {
                            const angle = i * 0.9 + this.animTime * 8;
                            const hx1 = oppRelX + Math.cos(angle) * 22;
                            const hy1 = (oppRelY - 90) + (i * 15);
                            
                            const hx2 = oppRelX - Math.cos(angle) * 22;
                            const hy2 = (oppRelY - 90) + (i * 15);
                            
                            ctx.beginPath();
                            ctx.arc(hx1, hy1, 4, 0, Math.PI*2);
                            ctx.fill(); ctx.stroke();
                            
                            ctx.beginPath();
                            ctx.arc(hx2, hy2, 4, 0, Math.PI*2);
                            ctx.fill(); ctx.stroke();
                            
                            // Math symbols falling down onto target
                            ctx.fillStyle = '#00f0ff';
                            ctx.font = 'bold 8px monospace';
                            ctx.fillText(mathSymbols[i % mathSymbols.length], oppRelX + (Math.sin(i * 33) * 35), -150 + ((this.animTime * 300 + i * 40) % 250));
                        }
                    }
                }
                
                // 2. Draw Fatality Title Card in Phase 4 (Absolute screen space)
                if (progress >= 120) {
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform matrix to screen coordinates
                    
                    // Extra background dimming
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.fillStyle = '#ff0000';
                    ctx.shadowColor = '#ff0000';
                    ctx.shadowBlur = 12;
                    ctx.font = 'bold 36px "Share Tech Mono", monospace';
                    ctx.textAlign = 'center';
                    
                    const textY = Math.min(canvas.height / 2 - 30, -50 + (progress - 120) * 2.2);
                    ctx.fillText('FATALITY', canvas.width / 2, textY);
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = '#ffffff';
                    ctx.shadowBlur = 4;
                    ctx.font = 'bold 11px monospace';
                    ctx.fillText(`${this.data.name.toUpperCase()} WINS`, canvas.width / 2, textY + 25);
                    
                    ctx.fillStyle = this.color;
                    ctx.fillText('REASONING FATALITY', canvas.width / 2, textY + 40);
                    
                    ctx.restore();
                }
                ctx.restore();
            }
        }

        ctx.restore();
    }
}

function createParticles(x, y, color, count, floatUp = false, isDigit = false) {
    AIEngine.Particles.spawnBurst(x, y, {
        count: count,
        color: color,
        speed: floatUp ? [50, 100] : [100, 300],
        gravity: floatUp ? -120 : 0,
        lifespan: [0.6, 1.2],
        size: [2.5, 6],
        shape: isDigit ? 'text' : 'square',
        textFn: isDigit ? () => (Math.random() > 0.5 ? '1' : '0') : null
    });
}
function createDirectionalBlood(x, y, color, count, dirX, dirY) {
    const baseAngle = Math.atan2(dirY, dirX);
    for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * 0.95;
        const speed = Math.random() * 250 + 150;
        AIEngine.Particles.spawnBurst(x, y, {
            count: 1,
            color: color,
            speed: speed,
            gravity: 480,
            lifespan: [0.8, 1.4],
            size: [2.5, 6.5],
            shape: 'text',
            textFn: () => (Math.random() > 0.5 ? '1' : '0')
        });
    }
}
function renderVFX(ctx) {
    // Smears
    fightState.smears.forEach(s => {
        ctx.globalAlpha = s.life * 0.3;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x + (s.dir * 40), s.y - 60, 20, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1.0;
    
    // Sparks (Starbursts)
    fightState.sparks.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(s.life, s.life);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
        ctx.beginPath();
        for(let i=0; i<8; i++) {
            ctx.rotate(Math.PI/4);
            ctx.lineTo(0, -30); ctx.lineTo(5, 0);
        }
        ctx.fill();
        ctx.restore();
    });
    
    // Render engine particles
    AIEngine.Particles.draw(ctx);
}

function updateVFX(dt) {
    for(let i = fightState.smears.length-1; i>=0; i--) {
        fightState.smears[i].life -= dt * 4;
        if(fightState.smears[i].life <= 0) fightState.smears.splice(i, 1);
    }
    for(let i = fightState.sparks.length-1; i>=0; i--) {
        fightState.sparks[i].life -= dt * 5;
        if(fightState.sparks[i].life <= 0) fightState.sparks.splice(i, 1);
    }
    
    // Update engine particles
    AIEngine.Particles.update(dt);
}

function spawnWeapon() {
    const types = ['Keyboard', 'Server', 'Banhammer'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = 100 + Math.random() * (canvas.width - 200);
    fightState.weapons.push(new Weapon(x, -50, type));
}

function checkCollisions() {
    const processHit = (attacker, victim) => {
        if(attacker.hitbox && attacker.hitbox.active) {
            let h = attacker.hitbox;
            if(Math.abs(h.x - victim.x) < (h.w/2 + victim.w/2) && Math.abs(h.y - victim.y) < (h.h/2 + victim.h/2)) {
                h.active = false;
                if (h.type === 'grab') {
                    if (victim.state !== 'hit' && victim.state !== 'ko' && victim.state !== 'dizzy' && victim.state !== 'fatality_victim' && victim.hp > 0 && victim.y >= GROUND_Y) {
                        attacker.state = 'throwing';
                        attacker.stateTimer = 40; 
                        attacker.stateTimerMax = 40;
                        victim.state = 'grabbed';
                        victim.stateTimer = 40;
                        victim.stateTimerMax = 40;
                        attacker.attackConnected = true;
                        Audio.hit();
                    }
                } else {
                    victim.takeDamage(h.damage, h.type, h.unblockable);
                    attacker.attackConnected = true;
                    
                    // OpenAI RLHF Stack Addition on melee hit
                    if (attacker.data && attacker.data.vendor && attacker.data.vendor.toLowerCase() === 'openai') {
                        attacker.rlhfStacks = Math.min(5, (attacker.rlhfStacks || 0) + 1);
                        createParticles(attacker.x, attacker.y - 60, '#10A37F', 6);
                    }
                    
                    // Google Context reward on melee hit
                    if (attacker.data && attacker.data.vendor && attacker.data.vendor.toLowerCase() === 'google') {
                        attacker.contextTokens = Math.min(attacker.maxContextTokens, attacker.contextTokens + 120000);
                    }
                    
                    if (attacker.weapon) {
                        attacker.weapon.durability--;
                        if(attacker.weapon.durability <= 0) {
                            createParticles(attacker.x, attacker.y, '#aaa', 20);
                            attacker.weapon = null; // Break weapon
                        }
                    }
                }
            }
        }
    };
    processHit(fightState.p1, fightState.p2);
    processHit(fightState.p2, fightState.p1);

    for (let i = fightState.projectiles.length - 1; i >= 0; i--) {
        let proj = fightState.projectiles[i];
        const dt = 1/60; // Approximate frame step for continuous calculations

        // 1. OpenAI Exploding Bounding Box (box / box_perfect)
        if (proj.type === 'box' || proj.type === 'box_perfect') {
            proj.life -= dt * 60;
            const target = proj.isPlayerProj ? fightState.p2 : fightState.p1;
            // Bounding box tracks opponent position
            proj.x = target.x;
            if (proj.life <= 0) {
                const isPerf = proj.type === 'box_perfect';
                target.takeDamage(proj.damage, 'heavy_hit', isPerf); // box_perfect is unblockable
                createParticles(proj.x, proj.y - 45, proj.color, 25, false, true);
                Audio.super();
                fightState.shake = isPerf ? 24 : 16;
                fightState.projectiles.splice(i, 1);
            }
            continue;
        }

        // 2. Google Multimodal Beam continuous hit ticks
        if (proj.type === 'beam') {
            proj.life -= dt * 60;
            const target = proj.isPlayerProj ? fightState.p2 : fightState.p1;
            const correctSide = Math.sign(proj.vx) > 0 ? (target.x > proj.x) : (target.x < proj.x);
            
            // Expand range and damage tick under VISION stance
            const vRange = proj.modality === 'VISION' ? 95 : 70;
            if (correctSide && Math.abs(target.y - proj.y) < vRange && Math.random() < 0.15) {
                const tickDmg = proj.damage * (proj.modality === 'VISION' ? 0.22 : 0.15);
                target.takeDamage(tickDmg, 'projectile');
                
                // Reward Google beam owner
                const owner = proj.isPlayerProj ? fightState.p1 : fightState.p2;
                if (owner && owner.data && owner.data.vendor && owner.data.vendor.toLowerCase() === 'google') {
                    owner.contextTokens = Math.min(owner.maxContextTokens, owner.contextTokens + (proj.modality === 'VISION' ? 40000 : 30000));
                }
            }
            if (proj.life <= 0) {
                fightState.projectiles.splice(i, 1);
            }
            continue;
        }

        // 3. Standard Projectile collision detection
        const target = proj.isPlayerProj ? fightState.p2 : fightState.p1;
        const attacker = proj.isPlayerProj ? fightState.p1 : fightState.p2;
        const hit = Math.abs(proj.x - target.x) < 38 && proj.y >= (target.y - target.h - 10) && proj.y <= (target.y + 10);

        if (hit) {
            target.takeDamage(proj.damage, proj.type === 'deepseek_special' ? 'heavy_hit' : 'projectile');
            
            // --- Llama Spit Hallucination Effect ---
            if (proj.type === 'llama') {
                const poisonChance = proj.tier >= 4 ? 0.50 : 0.30;
                if (Math.random() < poisonChance) {
                    target.hallucinationTime = 3.0; // Invert control pathways for 3 seconds
                    createParticles(target.x, target.y - 60, '#0467DF', 15, true); // blue digital dust
                }
            }
            
            // OpenAI RLHF Stack Addition on projectile hit
            if (attacker && attacker.data && attacker.data.vendor && attacker.data.vendor.toLowerCase() === 'openai') {
                attacker.rlhfStacks = Math.min(5, (attacker.rlhfStacks || 0) + 1);
            }

            // Google Projectile Hit rewards
            if (attacker && attacker.data && attacker.data.vendor && attacker.data.vendor.toLowerCase() === 'google') {
                attacker.contextTokens = Math.min(attacker.maxContextTokens, attacker.contextTokens + 80000);
            }

            proj.active = false;
        }
        
        if (!proj.active) {
            createParticles(proj.x, proj.y, proj.color, 12, false, proj.type === 'deepseek_special');
            fightState.projectiles.splice(i, 1);
        }
    }
}

// ... CheckWinCondition, updateHUD, initFight, initTitleCanvas ...
// (We append the original bottom logic exactly so the game starts correctly)
function checkWinCondition() {
    if(!fightState.active) return;
    
    const timeOut = fightState.timer <= 0;
    const p1Ko = fightState.p1.state === 'ko';
    const p2Ko = fightState.p2.state === 'ko';
    
    if (timeOut || p1Ko || p2Ko) {
        fightState.active = false;
        
        let p1Won = fightState.p1.hp > fightState.p2.hp;
        if (p1Ko) p1Won = false;
        if (p2Ko) p1Won = true;
        
        if(p1Won) fightState.p1Wins++;
        else fightState.p2Wins++;
        
        const isFatality = fightState.p1.wasVaporized || fightState.p2.wasVaporized;
        document.getElementById('ko-overlay').classList.add('show');
        document.getElementById('ko-text').textContent = isFatality ? 'FATALITY' : (timeOut ? 'TIME OVER' : 'K.O.');
        document.getElementById('ko-text').classList.add('show');
        
        // Hide "FINISH THEM" announcement if active
        const el = document.getElementById('fight-announcement');
        if (el) el.style.opacity = 0;
        
        setTimeout(() => {
            // End of round
            if(p1Won) {
                gameState.ladderProgress = Math.max(gameState.ladderProgress, gameState.currentOpponentIdx + 1);
                localStorage.setItem('modelKombatLadder', gameState.ladderProgress);
                
                document.getElementById('result-title').textContent = 'VICTORY';
                document.getElementById('result-title').className = 'modal-title victory';
                document.getElementById('result-sub').textContent = `Defeated ${fightState.p2.data.name}`;
            } else {
                document.getElementById('result-title').textContent = 'DEFEAT';
                document.getElementById('result-title').className = 'modal-title defeat';
                document.getElementById('result-sub').textContent = `Felled by ${fightState.p2.data.name}`;
            }
            
            drawThumbnail(document.getElementById('result-canvas'), p1Won ? fightState.p1.data : fightState.p2.data, true);
            document.getElementById('result-modal').classList.remove('hidden');
        }, 3000);
    }
}

function renderBackground(ctx, w, h, camera) {
    const camX = camera ? camera.x : 0;
    const camZoom = camera ? camera.zoom : 1;
    
    // 1. Deep space background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#020208');
    bgGrad.addColorStop(0.7, '#070a1e');
    bgGrad.addColorStop(1, '#0e0b24');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
    
    // 2. Distant digital grid skyline - Parallax Scroll!
    ctx.save();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)'; // purple skyline
    ctx.lineWidth = 1;
    const cityY = GROUND_Y - 40;
    const cityWidth = 430; // skyline path loop width
    const cityOffset = -(camX * 0.28) % cityWidth;
    
    ctx.translate(cityOffset, 0);
    for (let offset = -cityWidth; offset < w + cityWidth * 2; offset += cityWidth) {
        ctx.save();
        ctx.translate(offset, 0);
        ctx.beginPath();
        ctx.moveTo(0, cityY);
        ctx.lineTo(30, cityY); ctx.lineTo(30, cityY - 45); ctx.lineTo(55, cityY - 45); ctx.lineTo(55, cityY);
        ctx.lineTo(85, cityY); ctx.lineTo(85, cityY - 70); ctx.lineTo(120, cityY - 70); ctx.lineTo(120, cityY);
        ctx.lineTo(155, cityY); ctx.lineTo(155, cityY - 35); ctx.lineTo(190, cityY - 35); ctx.lineTo(190, cityY);
        ctx.lineTo(230, cityY); ctx.lineTo(230, cityY - 80); ctx.lineTo(270, cityY - 80); ctx.lineTo(270, cityY);
        ctx.lineTo(315, cityY); ctx.lineTo(315, cityY - 55); ctx.lineTo(350, cityY - 55); ctx.lineTo(350, cityY);
        ctx.lineTo(395, cityY); ctx.lineTo(395, cityY - 100); ctx.lineTo(430, cityY - 100); ctx.lineTo(430, cityY);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();

    // 3. Cybernetic horizon glow
    const horizGrad = ctx.createLinearGradient(0, GROUND_Y - 50, 0, GROUND_Y);
    horizGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
    horizGrad.addColorStop(1, 'rgba(0, 240, 255, 0.12)');
    ctx.fillStyle = horizGrad;
    ctx.fillRect(0, GROUND_Y - 50, w, 50);

    // 4. Detailed perspective floor - Parallax horizontal floor lines
    ctx.fillStyle = '#050612';
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);
    
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const floorOffsetX = -(camX * camZoom) % 35;
    for(let i = -150 + floorOffsetX; i < w + 200; i += 35) {
        ctx.moveTo(i, GROUND_Y);
        ctx.lineTo(i - 120, h);
    }
    ctx.stroke();
    
    // Horizontal floor depth lines
    for(let y = GROUND_Y; y < h; y += 14) {
        const ratio = (y - GROUND_Y) / (h - GROUND_Y);
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.04 + ratio * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    
    // Neon floor edge divider
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(w, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function updateFight(dt) {
    if (gameState.screen !== 'fight') {
        AIEngine.Loop.stop();
        return;
    }
    
    if (fightState.finishThemTimer > 0) {
        fightState.finishThemTimer -= dt * 60;
    }
    
    // Update player and opponent physics
    fightState.p1.update(dt);
    fightState.p2.update(dt);
    
    if (fightState.active) {
        fightState.timer -= dt;
        checkCollisions();
        checkWinCondition();
        
        const anyoneDizzy = (fightState.p1 && fightState.p1.state === 'dizzy') || (fightState.p2 && fightState.p2.state === 'dizzy');
        if (!anyoneDizzy && !fightState.fatalityActive) {
            if (fightState.weaponSpawnTimer === undefined) fightState.weaponSpawnTimer = Math.random() * 500 + 500;
            fightState.weaponSpawnTimer -= dt * 60;
            if (fightState.weaponSpawnTimer <= 0) {
                spawnWeapon();
                fightState.weaponSpawnTimer = Math.random() * 500 + 500;
            }
        }
    }
    
    updateVFX(dt);
    fightState.projectiles.forEach(p => p.update(dt));
    fightState.weapons.forEach(w => w.update(dt));
    
    // Update midpoint tracking camera
    if (fightState.camera) {
        fightState.camera.update(fightState.p1, fightState.p2, dt);
        fightState.camera.y = GROUND_Y * (1 - 1 / fightState.camera.zoom);
    }
    
    // Update UI HealthBars
    if (fightState.p1HealthBar) fightState.p1HealthBar.update(fightState.p1.hp / fightState.p1.maxHp, dt);
    if (fightState.p2HealthBar) fightState.p2HealthBar.update(fightState.p2.hp / fightState.p2.maxHp, dt);
    
    updateHUD();

    // Sync with AIEngine State for AI Autoplay tracking
    AIEngine.State.set('active', fightState.active);
    if (fightState.p1) {
        AIEngine.State.set('p1', {
            x: fightState.p1.x,
            y: fightState.p1.y,
            state: fightState.p1.state,
            hp: fightState.p1.hp,
            maxHp: fightState.p1.maxHp,
            ki: fightState.p1.ki,
            maxKi: fightState.p1.maxKi,
            dir: fightState.p1.dir
        });
    }
    if (fightState.p2) {
        AIEngine.State.set('p2', {
            x: fightState.p2.x,
            y: fightState.p2.y,
            state: fightState.p2.state,
            hp: fightState.p2.hp,
            maxHp: fightState.p2.maxHp,
            ki: fightState.p2.ki,
            maxKi: fightState.p2.maxKi,
            dir: fightState.p2.dir
        });
    }
}

function renderFight() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Render Screen-space Parallax background
    renderBackground(ctx, canvas.width, canvas.height, fightState.camera);
    
    // Dark blackout overlay during Fatality execution
    if (fightState.fatalityActive) {
        ctx.fillStyle = 'rgba(6, 6, 6, 0.88)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 2. Render World entities transformed relative to camera projection
    ctx.save();
    if (fightState.camera) {
        ctx.translate(-fightState.camera.x * fightState.camera.zoom + fightState.camera.shakeX, -fightState.camera.y * fightState.camera.zoom + fightState.camera.shakeY);
        ctx.scale(fightState.camera.zoom, fightState.camera.zoom);
    }
    
    fightState.weapons.forEach(w => w.render(ctx));
    fightState.p1.render(ctx);
    fightState.p2.render(ctx);
    fightState.projectiles.forEach(p => p.render(ctx));
    renderVFX(ctx);
    ctx.restore();
    
    // 3. Render Screen-space UI
    if (fightState.p1HealthBar) fightState.p1HealthBar.draw(ctx);
    if (fightState.p2HealthBar) {
        fightState.p2HealthBar.x = canvas.width - 320;
        fightState.p2HealthBar.draw(ctx);
    }
    
    // Announce Dizzy / Finish Them
    const anyoneDizzy = (fightState.p1 && fightState.p1.state === 'dizzy') || (fightState.p2 && fightState.p2.state === 'dizzy');
    if (anyoneDizzy) {
        ctx.save();
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 22;
        ctx.font = 'bold 36px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const scale = 1.0 + Math.sin(performance.now() * 0.012) * 0.07;
        ctx.translate(canvas.width / 2, canvas.height / 2 - 40);
        ctx.scale(scale, scale);
        ctx.fillText('FINISH THEM!', 0, 0);
        ctx.restore();
    }
    
    // Letterbox bars during Fatality
    if (fightState.fatalityActive) {
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, 24);
        ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
        ctx.restore();
    }
}

function getFighterSubLabel(f) {
    if (!f || !f.data || !f.data.vendor) return '';
    const vend = f.data.vendor.toLowerCase();
    if (vend === 'google') {
        const tokens = f.contextTokens || 0;
        let tokenStr = '';
        if (tokens >= 1000000) tokenStr = (tokens / 1000000).toFixed(2) + 'M';
        else if (tokens >= 1000) tokenStr = Math.round(tokens / 1000) + 'k';
        else tokenStr = Math.round(tokens);
        return `Modality: ${f.activeModality} | CTX: ${tokenStr}`;
    }
    else if (vend === 'openai') {
        if ((f.cotTokens || 0) > 0) {
            let cotText = '';
            if (f.cotTokens === 1) cotText = '●';
            else if (f.cotTokens === 2) cotText = '● ●';
            else if (f.cotTokens === 3) cotText = '● ● ● [CoT]';
            return `Reasoning: ${cotText}`;
        }
        return 'Aligned';
    }
    else if (vend === 'meta') {
        let ftString = '';
        if (f.metaFineTune.punch > 0) ftString += `P:${f.metaFineTune.punch} `;
        if (f.metaFineTune.kick > 0) ftString += `K:${f.metaFineTune.kick} `;
        if (f.metaFineTune.projectile > 0) ftString += `R:${f.metaFineTune.projectile} `;
        const ftText = ftString !== '' ? `FT: ${ftString.trim()} | ` : '';
        return `${ftText}Size: ${f.metaCurrentSize} (${Math.round(f.metaParameters)}%)`;
    }
    else if (vend === 'deepseek') {
        const expertLabel = f.currentExpert.toUpperCase();
        const modeLabel = f.isMoE ? `MoE: ${expertLabel}` : `MLA: ${expertLabel}`;
        let cotLabel = `CoT: ${Math.round(f.reasoningTokens)}%`;
        if (f.reasoningTokens >= 50) cotLabel += ' [MTP READY]';
        return `${modeLabel} | ${cotLabel}`;
    }
    return '';
}

function updateHUD() {
    if(!fightState.p1 || !fightState.p2) return;
    
    const p1SubEl = document.getElementById('hud-p1-sub');
    const p2SubEl = document.getElementById('hud-p2-sub');
    if (p1SubEl) p1SubEl.textContent = getFighterSubLabel(fightState.p1);
    if (p2SubEl) p2SubEl.textContent = getFighterSubLabel(fightState.p2);
    
    const p1Ki = document.getElementById('ki-bar-p1');
    if(p1Ki) {
        const pct = (fightState.p1.ki / fightState.p1.maxKi) * 100;
        p1Ki.style.width = pct + '%';
        if(fightState.p1.ki >= (fightState.p1.data.hasMoE ? fightState.p1.data.moeThreshold : 100)) p1Ki.classList.add('charging');
        else p1Ki.classList.remove('charging');
    }
    const p2Ki = document.getElementById('ki-bar-p2');
    if(p2Ki) {
        const pct = (fightState.p2.ki / fightState.p2.maxKi) * 100;
        p2Ki.style.width = pct + '%';
        if(fightState.p2.ki >= (fightState.p2.data.hasMoE ? fightState.p2.data.moeThreshold : 100)) p2Ki.classList.add('charging');
        else p2Ki.classList.remove('charging');
    }
    
    const timerEl = document.getElementById('timer-display');
    if(timerEl) {
        timerEl.textContent = Math.ceil(Math.max(0, fightState.timer));
        if(fightState.timer <= 10) timerEl.classList.add('urgent');
        else timerEl.classList.remove('urgent');
    }
    
    // Update Combo Display
    const comboEl = document.getElementById('combo-display');
    if (comboEl) {
        if (fightState.p2.combo > 1) {
            comboEl.textContent = `${fightState.p2.combo} HIT COMBO!`;
            comboEl.style.opacity = 1;
        } else if (fightState.p1.combo > 1) {
            comboEl.textContent = `${fightState.p1.combo} HIT COMBO!`;
            comboEl.style.opacity = 1;
        } else {
            comboEl.style.opacity = 0;
        }
    }
}

function initFight() {
    canvas.width  = canvas.offsetWidth  || 800;
    canvas.height = canvas.offsetHeight || 450;
    GROUND_Y = Math.round(canvas.height * 0.80);

    fightState.active = true;
    fightState.timer = 99;
    fightState.p1Wins = 0;
    fightState.p2Wins = 0;
    fightState.round = 1;
    fightState.particles = [];
    fightState.projectiles = [];
    fightState.weapons = [];
    fightState.sparks = [];
    fightState.smears = [];
    fightState.finishThemTimer = 0;
    fightState.fatalityActive = false;
    
    // Clear recompiled engine particles
    AIEngine.Particles.clear();
    
    // Setup Camera
    fightState.camera = new AIEngine.Camera2D({
        minX: 0,
        maxX: 1400,
        width: canvas.width,
        height: canvas.height
    });
    
    // Setup HealthBars (canvas drawn)
    fightState.p1HealthBar = new AIEngine.UI.HealthBar({ x: 20, y: 15, width: 300, height: 16, isPlayer: true });
    fightState.p2HealthBar = new AIEngine.UI.HealthBar({ x: canvas.width - 320, y: 15, width: 300, height: 16, isPlayer: false });
    
    // Hide DOM health bars
    document.querySelectorAll('.hp-bar-wrapper').forEach(el => el.style.display = 'none');
    
    const p1Data = FIGHTERS_DB[gameState.playerFighterId];
    const p2Data = FIGHTERS_DB[LADDER[gameState.currentOpponentIdx]];
    
    fightState.p1 = new Fighter(p1Data, true);
    fightState.p2 = new Fighter(p2Data, false);
    
    // Spawn positions in world space
    fightState.p1.x = 350;
    fightState.p1.y = GROUND_Y;
    fightState.p2.x = 1050;
    fightState.p2.y = GROUND_Y;
    
    document.getElementById('hud-p1-name').textContent = p1Data.name.toUpperCase();
    document.getElementById('hud-p2-name').textContent = p2Data.name.toUpperCase();
    
    document.getElementById('ko-overlay').classList.remove('show');
    document.getElementById('ko-text').classList.remove('show');
    
    ['p1-win-1','p1-win-2'].forEach((id,i)=>{ const el=document.getElementById(id); if(el) el.classList.toggle('filled', i < fightState.p1Wins); });
    ['p2-win-1','p2-win-2'].forEach((id,i)=>{ const el=document.getElementById(id); if(el) el.classList.toggle('filled', i < fightState.p2Wins); });
    
    gameState.screen = 'fight';
    
    // Start AIEngine loop
    AIEngine.Loop.start(updateFight, renderFight);
}

// --- THUMBNAIL RENDERER ---
function drawThumbnail(canv, f, isLarge = false) {
    if(!canv) return;
    const c = canv.getContext('2d');
    c.clearRect(0,0,canv.width,canv.height);
    
    c.save();
    c.translate(canv.width/2, canv.height - (isLarge ? 24 : 14));
    const scale = isLarge ? 1.65 : 0.82;
    c.scale(scale, scale);
    
    let dummy = new Fighter(f, true);
    dummy.x = 0; dummy.y = 0;
    dummy.render(c);
    
    c.restore();
}

// Init title screen canvas animation
function initTitleCanvas() {
    const c = document.getElementById('title-canvas');
    if(!c) return;
    const ctx = c.getContext('2d');
    let time = 0;
    
    function loop() {
        if(gameState.screen !== 'title') return requestAnimationFrame(loop);
        
        c.width = c.parentElement.clientWidth;
        c.height = c.parentElement.clientHeight;
        ctx.clearRect(0,0,c.width,c.height);
        
        time += 0.05;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<c.width; i+=40) {
            ctx.moveTo(i, c.height/2);
            ctx.lineTo(i + Math.sin(time+i)*50, c.height);
        }
        ctx.stroke();
        
        requestAnimationFrame(loop);
    }
    loop();
}

function flashScreen(color) {
    const el = document.getElementById('moe-flash');
    if (el) {
        el.style.backgroundColor = color;
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 150);
    }
}

function showAnnouncement(text) {
    const el = document.getElementById('fight-announcement');
    if (el) {
        el.textContent = text;
        el.style.opacity = 1;
        setTimeout(() => {
            el.style.opacity = 0;
        }, 1500);
    }
}

// Start
document.addEventListener('DOMContentLoaded', () => {
    AIEngine.init({ seed: 'model-kombat' });
    AIEngine.Audio.init();
    showScreen('title');
    initTitleCanvas();
});

// =====================================================================
// AI AUTOPLAY AGENT CONTROLLER REGISTRATION
// =====================================================================
AIEngine.Agent.registerController((state, input) => {
    if (!state.active) return;
    const p1 = state.p1;
    const p2 = state.p2;
    if (!p1 || !p2) return;
    
    const dist = Math.abs(p1.x - p2.x);
    const p1Dir = p1.dir;
    const rightKey = p1Dir === 1 ? 'd' : 'a';
    const leftKey = p1Dir === 1 ? 'a' : 'd';
    
    // Dizzy execution
    if (p2.state === 'dizzy') {
        if (dist > 75) {
            input.simulateKey(rightKey, 'keydown');
            setTimeout(() => input.simulateKey(rightKey, 'keyup'), 100);
        } else {
            input.simulateKey(rightKey, 'keyup');
            input.simulateKey('f', 'keydown');
            setTimeout(() => input.simulateKey('f', 'keyup'), 50);
        }
        return;
    }
    
    // Defense: block if opponent is attacking
    if (p2.state === 'attack' && dist < 120 && Math.random() < 0.7) {
        input.simulateKey('b', 'keydown');
        setTimeout(() => input.simulateKey('b', 'keyup'), 200);
        return;
    }
    
    // Close range combo / offense
    if (dist <= 75) {
        input.simulateKey(rightKey, 'keyup'); // Stop moving
        if (Math.random() < 0.15 && p1.ki >= 100) {
            // Special Move
            input.simulateKey('f', 'keydown');
            setTimeout(() => input.simulateKey('f', 'keyup'), 50);
        } else {
            const move = Math.random() > 0.4 ? 'p' : 'k';
            input.simulateKey(move, 'keydown');
            setTimeout(() => input.simulateKey(move, 'keyup'), 50);
        }
    } 
    // Approach / spacing / charging
    else {
        if (p1.ki < 60 && Math.random() < 0.3) {
            input.simulateKey('c', 'keydown');
            setTimeout(() => input.simulateKey('c', 'keyup'), 300);
        } else {
            input.simulateKey(rightKey, 'keydown');
            setTimeout(() => input.simulateKey(rightKey, 'keyup'), 150);
        }
    }
});

// =====================================================================
// INTEGRATION TESTS REGISTRATION
// =====================================================================
AIEngine.Test.defineTest('Fight Initialization & HUD Mappings', async (t) => {
    showScreen('select');
    selectedPreviewId = 'claude-haiku';
    gameState.playerFighterId = selectedPreviewId;
    gameState.currentOpponentIdx = 0;
    showScreen('fight');
    
    t.expect(fightState.active).toBe(true, 'Fight state should be active');
    t.expect(fightState.p1.data.id).toBe('claude-haiku', 'P1 should be Claude Haiku');
    t.expect(fightState.p2.data.id).toBe('gemma-2b', 'P2 opponent should be Gemma 2B (first rung)');
});

AIEngine.Test.defineTest('Mixture of Experts Activation', async (t) => {
    showScreen('select');
    selectedPreviewId = 'o3';
    gameState.playerFighterId = selectedPreviewId;
    gameState.currentOpponentIdx = 0;
    showScreen('fight');
    
    // Simulate charging Ki past threshold
    fightState.p1.ki = 100;
    await t.tick(5);
    
    t.expect(fightState.p1.isMoE).toBe(true, 'P1 should enter MoE transformation past threshold');
});

AIEngine.Test.defineTest('Autoplay Combative Execution', async (t) => {
    showScreen('select');
    selectedPreviewId = 'gpt-4o';
    gameState.playerFighterId = selectedPreviewId;
    gameState.currentOpponentIdx = 0;
    showScreen('fight');
    
    // Start Autoplay Agent
    AIEngine.Agent.start();
    
    // Run fight ticks and verify that some movements or attacks occur
    const initialP1X = fightState.p1.x;
    await t.tick(40);
    
    // Stop Agent
    AIEngine.Agent.stop();
    
    const currentP1X = fightState.p1.x;
    t.expect(currentP1X !== initialP1X).toBe(true, 'Autoplay should simulate movement inputs');
});
