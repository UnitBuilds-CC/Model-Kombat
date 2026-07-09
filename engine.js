// ═══════════════════════════════════════════════════════════
// MODEL KOMBAT — engine.js (Game Loop, Rendering, Logic)
// ═══════════════════════════════════════════════════════════

const canvas = document.getElementById('fight-canvas');
const ctx = canvas.getContext('2d');

let fightState = {
    active: false,
    p1: null,
    p2: null,
    particles: [],
    timer: 99,
    round: 1,
    p1Wins: 0,
    p2Wins: 0,
    lastTime: 0,
    shake: 0
};

// --- INPUT HANDLING ---
const keys = { ArrowLeft: false, ArrowRight: false, p: false, k: false, b: false, c: false, s: false };
document.addEventListener('keydown', e => {
    if(!fightState.active) return;
    if(keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if(e.key === 'p') fightState.p1.action('punch');
    if(e.key === 'k') fightState.p1.action('kick');
    if(e.key === 'b') fightState.p1.action('block', true);
    if(e.key === 'c') fightState.p1.action('charge', true);
    if(e.key === 's') fightState.p1.action('special');
});
document.addEventListener('keyup', e => {
    if(!fightState.active) return;
    if(keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if(e.key === 'b') fightState.p1.action('block', false);
    if(e.key === 'c') fightState.p1.action('charge', false);
});

// Mobile button bindings
const bindBtn = (id, key, actionType) => {
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.addEventListener('touchstart', (e)=>{ e.preventDefault(); keys[key]=true; if(actionType) fightState.p1.action(actionType, true); btn.classList.add('pressed');});
    btn.addEventListener('touchend', (e)=>{ e.preventDefault(); keys[key]=false; if(actionType && (actionType==='block'||actionType==='charge')) fightState.p1.action(actionType, false); btn.classList.remove('pressed');});
    btn.addEventListener('mousedown', (e)=>{ keys[key]=true; if(actionType) fightState.p1.action(actionType, true); btn.classList.add('pressed');});
    btn.addEventListener('mouseup', (e)=>{ keys[key]=false; if(actionType && (actionType==='block'||actionType==='charge')) fightState.p1.action(actionType, false); btn.classList.remove('pressed');});
    btn.addEventListener('mouseleave', (e)=>{ keys[key]=false; if(actionType && (actionType==='block'||actionType==='charge')) fightState.p1.action(actionType, false); btn.classList.remove('pressed');});
};
bindBtn('btn-left', 'ArrowLeft');
bindBtn('btn-right', 'ArrowRight');
bindBtn('btn-punch', 'p', 'punch');
bindBtn('btn-kick', 'k', 'kick');
bindBtn('btn-block', 'b', 'block');
bindBtn('btn-charge', 'c', 'charge');
bindBtn('btn-special', 's', 'special');

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
        this.y = 200; // Floor level
        this.w = 50;
        this.h = 100;
        this.vx = 0;
        this.vy = 0;
        this.dir = isPlayer ? 1 : -1; // 1 = facing right, -1 = left
        this.state = 'idle'; // idle, walk, attack, block, charge, hit, moe_transform, ko
        this.stateTimer = 0;
        this.animTime = 0;
        
        this.isMoE = false;
        this.combo = 0;
        
        // Attack hitboxes
        this.hitbox = null; 
    }

    get dmg() { return this.dmgBase * (this.isMoE ? 1.35 : 1) * (this.isPlayer ? 1 : 1 + (gameState.currentOpponentIdx*0.05)); }
    get spd() { return this.spdBase * (this.isMoE ? 1.4 : 1); }

    action(type, isStart = true) {
        if(this.state === 'ko' || this.state === 'moe_transform' || this.state === 'hit') return;
        
        if(type === 'block') {
            if(isStart && this.state === 'idle' || this.state === 'walk') this.state = 'block';
            else if(!isStart && this.state === 'block') this.state = 'idle';
        }
        else if(type === 'charge') {
            if(isStart && (this.state === 'idle' || this.state === 'walk')) {
                this.state = 'charge';
                if(this.isPlayer) Audio.charge();
            }
            else if(!isStart && this.state === 'charge') this.state = 'idle';
        }
        else if(type === 'punch' || type === 'kick' || type === 'special') {
            if(this.state !== 'attack' && this.state !== 'block' && this.state !== 'charge') {
                this.state = 'attack';
                this.stateTimer = type === 'special' ? 40 : 20; // attack duration frames
                this.hitbox = {
                    x: this.x + (this.dir * (this.w/2 + 20)),
                    y: this.y - (type === 'kick' ? 20 : 60),
                    w: type === 'special' ? 60 : 40,
                    h: 30,
                    active: true,
                    damage: type === 'special' ? this.dmg * 2 : this.dmg,
                    type: type
                };
                
                // Special check
                if(type === 'special') {
                    if(!this.data.hasMoE && this.ki >= 100) {
                        this.hitbox.damage = this.dmg * 3.5;
                        this.ki = 0;
                        createParticles(this.x, this.y-50, this.color, 40);
                        if(this.isPlayer) Audio.super();
                    } else if (this.data.hasMoE && this.isMoE) {
                        this.hitbox.damage = this.dmg * 1.5;
                        this.ki -= 20;
                        if(this.ki < 0) this.ki = 0;
                    } else {
                        // normal special, no cost, weak
                        this.hitbox.damage = this.dmg * 1.2;
                    }
                } else {
                    if(this.isPlayer) Audio.hit();
                }
            }
        }
    }

    update(dt) {
        this.animTime += dt;
        
        // AI Logic
        if(!this.isPlayer && fightState.active) {
            this.updateAI();
        }

        // State machine
        if(this.state === 'hit') {
            this.stateTimer -= dt * 60;
            if(this.stateTimer <= 0) this.state = 'idle';
        }
        else if(this.state === 'attack') {
            this.stateTimer -= dt * 60;
            if(this.stateTimer < 10 && this.hitbox) this.hitbox.active = false;
            if(this.stateTimer <= 0) {
                this.state = 'idle';
                this.hitbox = null;
            }
        }
        else if(this.state === 'moe_transform') {
            this.stateTimer -= dt * 60;
            if(this.stateTimer <= 0) {
                this.state = 'idle';
                this.isMoE = true;
                if(this.data.hasMoE) this.tier = Math.min(5, this.tier + 1); // Evolve tier
            }
        }
        else if(this.state === 'charge') {
            this.ki += dt * 15;
            if(this.ki >= this.maxKi) this.ki = this.maxKi;
            if(this.ki % 10 < 1) createParticles(this.x + (Math.random()-0.5)*50, this.y, this.color, 1, true);
            
            // Trigger MoE
            if(this.data.hasMoE && !this.isMoE && this.ki >= this.data.moeThreshold) {
                this.state = 'moe_transform';
                this.stateTimer = 60; // 1 sec freeze
                this.combo = 0;
                flashScreen(this.color);
                Audio.moe();
                showAnnouncement(this.data.moeName);
                if(this.isPlayer) document.getElementById('hud-p1-name').textContent = this.data.moeName.toUpperCase();
                else document.getElementById('hud-p2-name').textContent = this.data.moeName.toUpperCase();
            }
        }
        else if(this.state === 'idle' || this.state === 'walk') {
            if(this.isPlayer) {
                if(keys.ArrowLeft) { this.vx = -this.spd * 30; this.state = 'walk'; }
                else if(keys.ArrowRight) { this.vx = this.spd * 30; this.state = 'walk'; }
                else { this.vx = 0; this.state = 'idle'; }
            }
        }
        
        // Physics
        this.x += this.vx * dt;
        
        // Bounds
        const opponent = this.isPlayer ? fightState.p2 : fightState.p1;
        if(opponent) {
            // Facing
            this.dir = this.x < opponent.x ? 1 : -1;
            
            // Collision with opponent body
            if(Math.abs(this.x - opponent.x) < 40) {
                if(this.x < opponent.x) this.x = opponent.x - 40;
                else this.x = opponent.x + 40;
            }
        }
        if(this.x < 30) this.x = 30;
        if(this.x > canvas.width - 30) this.x = canvas.width - 30;

        // MoE Drain
        if(this.isMoE) {
            this.ki -= dt * 2;
            if(this.ki <= 0) {
                this.ki = 0;
                this.isMoE = false;
                this.tier = this.data.tier; // Revert
                if(this.isPlayer) document.getElementById('hud-p1-name').textContent = this.data.name.toUpperCase();
                else document.getElementById('hud-p2-name').textContent = this.data.name.toUpperCase();
            }
        }
    }
    
    updateAI() {
        if(this.state === 'ko' || this.state === 'moe_transform' || this.state === 'hit') {
            this.vx = 0;
            return;
        }
        
        const p1 = fightState.p1;
        const dist = Math.abs(this.x - p1.x);
        
        // Difficulty scaling (0 to 1) based on ladder index
        const diff = gameState.currentOpponentIdx / 20;
        
        if(dist > 150) {
            // Charge or approach
            if(this.ki < (this.data.hasMoE ? this.data.moeThreshold : 100) && Math.random() < 0.05 + (diff*0.05)) {
                this.action('charge', true);
            } else if (this.state !== 'charge') {
                this.vx = -this.dir * this.spd * 25; // walk towards
                this.state = 'walk';
            }
        } else if (dist <= 150 && dist > 60) {
            // Stop charging, approach
            if(this.state === 'charge') this.action('charge', false);
            this.vx = this.dir * this.spd * 30;
            this.state = 'walk';
            
            if(p1.state === 'attack' && Math.random() < 0.2 + (diff*0.5)) {
                this.action('block', true);
                setTimeout(()=>this.action('block', false), 500);
            }
        } else {
            // Melee range
            this.vx = 0;
            if(this.state === 'charge') this.action('charge', false);
            
            if(p1.state === 'attack' && Math.random() < 0.3 + (diff*0.6)) {
                this.action('block', true);
                setTimeout(()=>this.action('block', false), 500);
            } else if (this.state !== 'block') {
                if(Math.random() < 0.05 + (diff*0.1)) {
                    const atk = Math.random() > 0.7 ? 'kick' : (Math.random() > 0.8 && this.ki >= 100 ? 'special' : 'punch');
                    this.action(atk);
                } else {
                    this.state = 'idle';
                }
            }
        }
    }

    takeDamage(dmg, type) {
        if(this.state === 'block') {
            dmg = dmg * 0.2;
            createParticles(this.x, this.y - 60, '#ffffff', 5);
            Audio.block();
        } else {
            this.state = 'hit';
            this.stateTimer = 15;
            this.combo++;
            fightState.shake = 5;
            createParticles(this.x, this.y - 60, this.color, 15);
            
            // Ki generation from taking damage
            this.ki += 2;
            if(this.ki > this.maxKi) this.ki = this.maxKi;
        }
        
        let actualDmg = Math.max(1, dmg - (this.defBase * 0.2));
        this.hp -= actualDmg;
        
        if(this.hp <= 0) {
            this.hp = 0;
            this.state = 'ko';
            Audio.ko();
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.dir, 1); // Flip based on direction
        
        // Aura if MoE
        if(this.isMoE || this.state === 'moe_transform' || this.state === 'charge') {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = this.state === 'moe_transform' ? 40 : 20;
            if(this.tier === 5 || this.isMoE) createParticles(this.x + (Math.random()-0.5)*30, this.y - Math.random()*100, this.color, 1, true);
        }

        const t = this.animTime * 10;
        let bobY = 0;
        let armRot = 0;
        let legRot = 0;
        
        if(this.state === 'idle') bobY = Math.sin(t) * 2;
        if(this.state === 'walk') { bobY = Math.abs(Math.sin(t*1.5)) * 5; armRot = Math.sin(t*1.5) * 0.5; legRot = Math.sin(t*1.5) * 0.5; }
        if(this.state === 'attack') { armRot = -1.5; } // Punch forward
        if(this.state === 'block') { armRot = -0.5; }
        if(this.state === 'hit') { ctx.rotate(-0.2); }
        if(this.state === 'ko') { ctx.rotate(-Math.PI/2); ctx.translate(0, 40); }

        ctx.translate(0, -bobY);
        
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        
        // Render based on Tier
        switch(this.tier) {
            case 1: // Primitive Block
                ctx.fillRect(-20, -90, 40, 90);
                break;
            case 2: // Pivot Blocks
                // Back arm/leg
                ctx.save(); ctx.translate(0, -70); ctx.rotate(-armRot); ctx.fillRect(-10, 0, 20, 40); ctx.restore();
                ctx.save(); ctx.translate(0, -40); ctx.rotate(-legRot); ctx.fillRect(-10, 0, 20, 40); ctx.restore();
                // Body & Head
                ctx.fillRect(-20, -90, 40, 50);
                ctx.beginPath(); ctx.arc(0, -100, 15, 0, Math.PI*2); ctx.fill();
                // Front arm/leg
                ctx.save(); ctx.translate(0, -70); ctx.rotate(armRot); ctx.fillRect(-10, 0, 20, 40); ctx.restore();
                ctx.save(); ctx.translate(0, -40); ctx.rotate(legRot); ctx.fillRect(-10, 0, 20, 40); ctx.restore();
                break;
            case 3: // Low Poly
                ctx.lineWidth = 2;
                ctx.lineJoin = 'bevel';
                ctx.beginPath();
                // Rough faceted body
                ctx.moveTo(-15, -90); ctx.lineTo(15, -90); ctx.lineTo(25, -50); ctx.lineTo(15, -40);
                ctx.lineTo(20, 0); ctx.lineTo(-20, 0); ctx.lineTo(-15, -40); ctx.lineTo(-25, -50); ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Head
                ctx.beginPath(); ctx.moveTo(0, -115); ctx.lineTo(15, -95); ctx.lineTo(-15, -95); ctx.closePath(); ctx.fill();
                // Arms (faceted)
                ctx.save(); ctx.translate(0, -70); ctx.rotate(armRot);
                ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(15,0); ctx.lineTo(20,20); ctx.lineTo(5,40); ctx.lineTo(-10,20); ctx.fill();
                ctx.restore();
                break;
            case 4: // Wireframe
            case 5: // Wireframe + glow
                ctx.fillStyle = 'transparent';
                ctx.lineWidth = 2;
                if(this.tier === 5) { ctx.shadowBlur = 10; ctx.shadowColor = this.color; }
                
                // Draw skeleton lines
                const drawBone = (x1, y1, x2, y2) => {
                    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                    if(this.tier === 5) {
                        ctx.save(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x1,y1,2,0,Math.PI*2); ctx.fill(); ctx.restore();
                        ctx.save(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x2,y2,2,0,Math.PI*2); ctx.fill(); ctx.restore();
                    }
                };
                
                // Spine
                drawBone(0, -40, 0, -80);
                // Head
                ctx.beginPath(); ctx.arc(0, -95, 12, 0, Math.PI*2); ctx.stroke();
                // Legs
                const lx = Math.sin(legRot)*30; const ly = Math.cos(legRot)*30;
                drawBone(0, -40, -lx, -40+ly); // Back leg
                drawBone(0, -40, lx, -40+ly);  // Front leg
                // Arms
                const ax = Math.sin(armRot)*35; const ay = Math.cos(armRot)*35;
                drawBone(0, -75, -ax, -75+ay); // Back arm
                drawBone(0, -75, ax, -75+ay);  // Front arm
                break;
        }
        
        ctx.restore();

        // Hitbox debug / render (uncomment to see)
        // if(this.hitbox && this.hitbox.active) {
        //    ctx.fillStyle = 'rgba(255,0,0,0.5)';
        //    ctx.fillRect(this.hitbox.x - this.hitbox.w/2, this.hitbox.y - this.hitbox.h/2, this.hitbox.w, this.hitbox.h);
        // }
    }
}

// --- PARTICLES ---
function createParticles(x, y, color, count, floatUp = false) {
    for(let i=0; i<count; i++) {
        fightState.particles.push({
            x: x, y: y,
            vx: (Math.random()-0.5) * 10,
            vy: floatUp ? -Math.random()*5 : (Math.random()-0.5) * 10,
            life: 1,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}
function updateParticles(dt) {
    for(let i = fightState.particles.length-1; i>=0; i--) {
        let p = fightState.particles[i];
        p.x += p.vx * dt * 30;
        p.y += p.vy * dt * 30;
        p.life -= dt * 2;
        if(p.life <= 0) fightState.particles.splice(i, 1);
    }
}
function renderParticles(ctx) {
    fightState.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

// --- GAME LOOP ---
function initFight() {
    canvas.width = document.querySelector('.fight-canvas-wrapper').clientWidth;
    canvas.height = document.querySelector('.fight-canvas-wrapper').clientHeight;
    
    fightState.p1 = new Fighter(FIGHTERS_DB[gameState.playerFighterId], true);
    fightState.p2 = new Fighter(FIGHTERS_DB[LADDER[gameState.currentOpponentIdx]], false);
    
    document.getElementById('hud-p1-name').textContent = fightState.p1.data.name.toUpperCase();
    document.getElementById('hud-p1-name').style.color = fightState.p1.color;
    document.getElementById('hud-p2-name').textContent = fightState.p2.data.name.toUpperCase();
    document.getElementById('hud-p2-name').style.color = fightState.p2.color;
    
    document.getElementById('hp-bar-p1').style.width = '100%';
    document.getElementById('hp-bar-p2').style.width = '100%';
    
    fightState.timer = 99;
    fightState.particles = [];
    fightState.active = true;
    fightState.lastTime = performance.now();
    
    document.getElementById('ko-overlay').classList.remove('show');
    document.getElementById('ko-text').classList.remove('show');
    
    showAnnouncement("FIGHT!");
    
    requestAnimationFrame(gameLoop);
}

function showAnnouncement(text) {
    const el = document.getElementById('fight-announcement');
    el.textContent = text;
    el.style.opacity = '1';
    el.style.transform = 'scale(1.2)';
    setTimeout(() => {
        el.style.transform = 'scale(1)';
        setTimeout(() => el.style.opacity = '0', 1000);
    }, 100);
}

function flashScreen(color) {
    const flash = document.getElementById('moe-flash');
    flash.style.background = color || 'white';
    flash.classList.add('flash');
    setTimeout(() => flash.classList.remove('flash'), 100);
}

function updateHUD() {
    document.getElementById('hp-bar-p1').style.width = `${(fightState.p1.hp / fightState.p1.maxHp) * 100}%`;
    document.getElementById('hp-bar-p2').style.width = `${(fightState.p2.hp / fightState.p2.maxHp) * 100}%`;
    
    document.getElementById('ki-bar-p1').style.setProperty('--ki-pct', `${fightState.p1.ki}%`);
    document.getElementById('ki-bar-p2').style.setProperty('--ki-pct', `${fightState.p2.ki}%`);
    
    document.getElementById('ki-bar-p1').classList.toggle('charging', fightState.p1.state === 'charge');
    document.getElementById('ki-bar-p2').classList.toggle('charging', fightState.p2.state === 'charge');
    
    document.getElementById('moe-ind-p1').classList.toggle('active', fightState.p1.isMoE);
    document.getElementById('moe-ind-p2').classList.toggle('active', fightState.p2.isMoE);
    
    document.getElementById('timer-display').textContent = Math.ceil(fightState.timer);
    document.getElementById('timer-display').classList.toggle('urgent', fightState.timer < 10);
    
    // Combo
    const comboEl = document.getElementById('combo-display');
    if(fightState.p1.combo > 1 || fightState.p2.combo > 1) {
        comboEl.textContent = `${Math.max(fightState.p1.combo, fightState.p2.combo)} HITS`;
        comboEl.style.opacity = '1';
    } else {
        comboEl.style.opacity = '0';
    }
}

function checkCollisions() {
    // P1 attacking P2
    if(fightState.p1.hitbox && fightState.p1.hitbox.active) {
        let h = fightState.p1.hitbox;
        let p2 = fightState.p2;
        if(Math.abs(h.x - p2.x) < (h.w/2 + p2.w/2) && Math.abs(h.y - p2.y) < (h.h/2 + p2.h/2)) {
            p2.takeDamage(h.damage, h.type);
            h.active = false;
        }
    }
    // P2 attacking P1
    if(fightState.p2.hitbox && fightState.p2.hitbox.active) {
        let h = fightState.p2.hitbox;
        let p1 = fightState.p1;
        if(Math.abs(h.x - p1.x) < (h.w/2 + p1.w/2) && Math.abs(h.y - p1.y) < (h.h/2 + p1.h/2)) {
            p1.takeDamage(h.damage, h.type);
            h.active = false;
        }
    }
}

function checkWinCondition() {
    if(!fightState.active) return;
    if(fightState.p1.hp <= 0 || fightState.p2.hp <= 0 || fightState.timer <= 0) {
        fightState.active = false;
        
        let p1Won = fightState.p1.hp > fightState.p2.hp;
        if(p1Won) fightState.p1Wins++;
        else fightState.p2Wins++;
        
        document.getElementById('ko-overlay').classList.add('show');
        document.getElementById('ko-text').textContent = fightState.timer <= 0 ? 'TIME OVER' : 'K.O.';
        document.getElementById('ko-text').classList.add('show');
        
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

function renderBackground(ctx, w, h) {
    // Floor grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<w; i+=40) { ctx.moveTo(i, 200); ctx.lineTo(i - 100, h); }
    for(let i=200; i<h; i+=20) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
    ctx.stroke();
    // Horizon line
    ctx.strokeStyle = 'var(--neon-cyan)';
    ctx.beginPath(); ctx.moveTo(0, 200); ctx.lineTo(w, 200); ctx.stroke();
}

function gameLoop(time) {
    if(gameState.screen !== 'fight') return;
    
    let dt = (time - fightState.lastTime) / 1000;
    fightState.lastTime = time;
    if(dt > 0.1) dt = 0.1;
    
    if(fightState.active) {
        fightState.timer -= dt;
        fightState.p1.update(dt);
        fightState.p2.update(dt);
        checkCollisions();
        checkWinCondition();
    }
    
    updateParticles(dt);
    updateHUD();
    
    if(fightState.shake > 0) {
        canvas.style.transform = `translate(${(Math.random()-0.5)*fightState.shake}px, ${(Math.random()-0.5)*fightState.shake}px)`;
        fightState.shake -= dt * 20;
    } else {
        canvas.style.transform = 'none';
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderBackground(ctx, canvas.width, canvas.height);
    
    fightState.p1.render(ctx);
    fightState.p2.render(ctx);
    renderParticles(ctx);
    
    requestAnimationFrame(gameLoop);
}

// --- THUMBNAIL RENDERER ---
function drawThumbnail(canv, f, isLarge = false) {
    if(!canv) return;
    const c = canv.getContext('2d');
    c.clearRect(0,0,canv.width,canv.height);
    
    c.save();
    c.translate(canv.width/2, isLarge ? canv.height - 30 : canv.height - 10);
    const scale = isLarge ? 1.5 : 0.5;
    c.scale(scale, scale);
    
    // Create a dummy fighter just for rendering
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

// Start
document.addEventListener('DOMContentLoaded', () => {
    showScreen('title');
    initTitleCanvas();
});
