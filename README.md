# 📟 Model Kombat (SYS_08) 🧠🥊
> *An Interactive, Playable Visualization of Large Language Model Constraints & Architectures*

Welcome, AI engineer. **Model Kombat** is a retro-cyber fighting game designed to teach the mechanical constraints, architectural paradigms, and hardware limits of Large Language Models (LLMs). 

In this game, 20 real-world AI models face off in a 2D arena. Every visual element, movement mechanic, and combat stance directly translates core machine learning engineering concepts (such as parameter scaling, KV-caching, Mixture of Experts, multi-modality, and alignment safety) into interactive gameplay loops.

---

## 🕹️ Play Directly Here

🎮 **[Model Kombat Live Web App](https://model-kombat-90043718455.us-central1.run.app)**
*   **Git Repository:** [https://github.com/UnitBuilds-CC/Model-Kombat](https://github.com/UnitBuilds-CC/Model-Kombat)

---

## 🧠 Educational Core Concepts & Game Translations

### 1. 📐 Parameter Scaling vs. Render Tiers
In deep learning, a model's representation capacity (intelligence) scales with its parameter count. In Model Kombat, a fighter's visual complexity, joint detail, and rendering fidelity directly reflect its real-world parameter size:
*   **Tier 1 (< 5B Parameters - Gemma 2B, Llama 3.2 3B) - *Primitive Capsules*:** Drawn as simple, single-color flat limbs with low joint segmentation. This visualizes the limited representation capacity and coarse output resolution of small edge models.
*   **Tier 2 (7B - 14B Parameters - Mistral 7B, Claude Haiku) - *Simple Vectors*:** Structured as thin skeletal wireframe vectors.
*   **Tier 3 (14B - 35B Parameters - Gemini Flash, Mixtral) - *Two-Tone Vectors*:** Rendered as dual-color, layered vector limbs.
*   **Tier 4 (35B - 100B Parameters - Llama 8B, Claude Sonnet) - *Cyborg Shading*:** Rendered as detailed vector cylinders with dynamic code particle streams flowing along their limbs.
*   **Tier 5 (> 100B Parameters - o3, GPT-4o, Claude Opus) - *Quantum Vectors*:** Rendered as glowing vector limbs with digital matrix code particles, soft drop-shadow depth buffers, and real-time afterimage motion trails.

---

### 2. ⚡ Reasoning Tokens & KV-Cache Overcharging
Instead of arbitrary "mana" or "stamina," fighters charge a **Ki bar** representing internal processing cycles and **Reasoning Tokens** (inspired by reasoning chains like OpenAI's o-series):
*   **Charging Ki:** Simulates the time-to-first-token (TTFT) phase, generating reasoning tokens.
*   **Limit Break:** Overcharging past 100% enters a golden-outlined **Limit Break** state, granting high-speed afterimages and super-armor.
*   **Context Eviction & Dizzy:** If a model holds its overcharged state too long, its context window overflows. This triggers **Context Eviction**—draining the model's HP and placing it in a **Dizzy** state. This represents how context window saturation degrades model coherence and leaves it vulnerable to failure.

---

### 3. 🌀 Mixture of Experts (MoE) Routing
Sparse Mixture of Experts (MoE) models do not activate all parameters on every token; instead, a gating network routes tokens to specialized experts.
*   **Active Experts:** Native MoE models in the game (like Mixtral and DeepSeek) dynamically spawn floating indicator nodes representing active **Text**, **Math**, or **Vision** experts.
*   **Routing Buffs:** Landing hits routes computation to these experts, granting temporary combat buffs:
    *   `TEXT` FFN: Increases walk speed (low-latency generation).
    *   `MATH` FFN: Increases damage output (logical compute).
    *   `VISION` FFN: Expands attack hitboxes (spatial awareness).

---

### 4. 🎤 Modality Stance Shifts
Multi-modal models process text, vision, and audio natively. Gemini and Gemma fighters utilize **Modality Stance Shifts** mid-fight:
*   **`TEXT` Stance (Default):** Balanced damage, defense, and speed.
*   **`VISION` Stance:** Expands the model's hand/foot strike hitboxes, reflecting the model's ability to parse coordinates and spatial layout data.
*   **`AUDIO` Stance:** Increases movement speed and horizontal air steering, representing low-latency audio stream processing.

---

### 5. 🛡️ Alignment Safety, RLHF, & Fatalities
When a model's HP drops to 0 while dizzy, the winner can trigger a cinematic **Fatality**. These are stylized visualizations of safety alignment, RLHF (Reinforcement Learning from Human Feedback), and prompt injection mitigations:
*   **OpenAI:** *Policy Censorship Override* — Drops a giant red `[ POLICY VIOLATION: REDACTED ]` banner while spinning green alignment hexagons restrict and crush the victim.
*   **Anthropic:** *Constitutional Erasure Blade* — Draws a golden prompt grid and sweeps a golden crescent constitutional rules shockwave across the screen, vaporizing the opponent according to safety guidelines.
*   **Google:** *Context Eviction Vortex* — Evicts the victim's entire context history, sucking them into a swirling binary code cyclone.
*   **Meta:** *Llama Parameter Stampede* — A stampede of wireframe llamas charges across the screen, stampeding the victim.
*   **Mistral:** *Sliding Window Decimation* — 8 orange cyclones swirl in a ring, converging to rip the victim apart in a wind tunnel.
*   **DeepSeek:** *Multi-Token Deletion* — A double-helix chain of math nodes wraps around the victim while math symbols rain from the sky.

---

## 🎮 How to Play

### Keyboard Controls
*   **`A` / `D`**: Walk Left / Right (Fast, responsive acceleration)
*   **`W`**: Jump (Tight horizontal air steering)
*   **`S`**: Crouch (Shrinks hurtbox)
*   **`P`**: Punch (Snappy melee strike, links combos)
*   **`K`**: Kick (Longer-range melee strike)
*   **`B`**: Block (Negates melee damage)
*   **`C`**: Charge Ki (Generates reasoning tokens, overcharges into Limit Break)
*   **`Q`**: Grab / Pick Up Weapon (Performs a suplex throw, or grabs weapon off floor)
*   **`R`**: Ranged Attack (Fires a specialized energy projectile)
*   **`F`**: Special Move / Fatality (Triggers model-specific special, or Fatality when opponent is dizzy)

---

## 📊 Complete Fighter Registry

| # | Name | Vendor | Tier | HP | DMG | SPD | DEF | Combat Stance & Unique Passive |
|---|---|---|---|---|---|---|---|---|
| 1 | **Gemma 2B** | Google | 1 | 100 | 5 | 8 | 5 | **Audio Modality Shift**: Double jump and high speed. |
| 2 | **GPT-3.5** | OpenAI | 1 | 105 | 5 | 7 | 6 | **Legacy Cache**: Retains Ki charge 15% longer. |
| 3 | **Llama 3.2 3B** | Meta | 1 | 100 | 5 | 7 | 6 | **Fine-Tuning**: Gains 5% defense on blocking consecutive hits. |
| 4 | **Mistral 7B** | Mistral | 2 | 110 | 6 | 7 | 6 | **Sliding Window**: Attacks have 10% less startup lag. |
| 5 | **Gemma 4B** | Google | 2 | 115 | 6 | 8 | 5 | **Vision Modality Shift**: Larger melee hitboxes. |
| 6 | **Claude Haiku** | Anthropic | 2 | 110 | 6 | 9 | 5 | **Constitutional Shield**: Takes 15% less damage from throws. |
| 7 | **Llama 3.1 8B** | Meta | 2 | 120 | 6 | 6 | 7 | **Llama Kick**: Heavy sweep knockdown. |
| 8 | **GPT-4o mini** | OpenAI | 3 | 125 | 7 | 8 | 6 | **RLHF Stack**: Landing 3 hits increases damage by 15%. |
| 9 | **Gemini Flash** | Google | 3 | 120 | 7 | 9 | 6 | **Multimodal Combo**: Automatically links punch into kick. |
| 10 | **Mixtral 8x7B** | Mistral | 3 | 130 | 7 | 7 | 7 | **Active MoE Gating**: Routes math expert on hits for DMG buff. |
| 11 | **Llama 4 Scout** | Meta | 4 | 140 | 8 | 7 | 8 | **MoE Adaptive Gating**: Toggles defense/speed buffs. |
| 12 | **DeepSeek V2** | DeepSeek | 4 | 145 | 8 | 7 | 8 | **Multi-Token Prediction**: Fires double projectiles. |
| 13 | **Claude Sonnet** | Anthropic | 4 | 135 | 8 | 8 | 7 | **Constitutional Guard**: Blocking consumes no Ki. |
| 14 | **Gemini 2.5 Pro** | Google | 4 | 140 | 8 | 9 | 7 | **Vision+Audio Shift**: Modality swap speed boosts. |
| 15 | **GPT-4o** | OpenAI | 4 | 145 | 8 | 8 | 8 | **RLHF Master**: Combo hits trigger critical damage. |
| 16 | **Llama 4 Maverick** | Meta | 4 | 150 | 9 | 7 | 9 | **Dense Parameter Armor**: Takes 20% less damage from specials. |
| 17 | **DeepSeek V3** | DeepSeek | 4 | 155 | 9 | 7 | 9 | **MLA Attention**: 15% chance to dodge projectiles. |
| 18 | **Claude Opus** | Anthropic | 5 | 160 | 9 | 9 | 8 | **Constitutional Blade**: Melee strikes have extended range. |
| 19 | **Gemini Ultra** | Google | 5 | 165 | 9 | 10 | 8 | **Ultra Stance Shift**: Can shift modalities instantly. |
| 20 | **o3** | OpenAI | 5 | 170 | 10 | 8 | 10 | **Deep Thinking Chain**: Charges Ki at double speed. |

---

## 🛠️ Local Setup & Docker Deployment

### 1. Local Python Static Server
Since the entire application is front-end native client-side code (utilizing pure HTML5 Canvas and synthesized Web Audio SFX), you can host it locally using Python:
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080` in your web browser.

### 2. Containerized Deployment with Nginx
A production-ready Dockerfile and Nginx configuration template are included to package the game inside an Alpine Nginx image:
```bash
# Build the Docker image
docker build -t model-kombat-game .

# Run the container locally
docker run -p 8080:8080 model-kombat-game
```

---

*Model Kombat: Mechanical sympathy is the key to victory.*
