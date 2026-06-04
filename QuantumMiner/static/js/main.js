"use strict";

// ── STATE ──
let player = {};
let minigameActive = false;
let marketTimerSeconds = 300;

// ── API ──
async function api(path, body = null) {
    const opts = {
        method: body !== null ? "POST" : "GET",
        headers: body !== null ? { "Content-Type": "application/json" } : {},
    };
    if (body !== null) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// ── TOAST ──
let toastTimer;
function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

// ── MODALS ──
function openModal(id)  { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

// ── FX ──
function spawnParticles(color, count = 8) {
    const zone = document.getElementById("click-zone");
    if (!zone) return;
    for (let i = 0; i < count; i++) {
        const p = document.createElement("div");
        p.className = "particle";
        p.style.cssText = `left:${40+Math.random()*20}%;top:${40+Math.random()*20}%;background:${color};--dx:${(Math.random()-.5)*110}px;--dy:${(Math.random()-.5)*90-40}px`;
        zone.appendChild(p);
        setTimeout(() => p.remove(), 950);
    }
}

function floatText(text, color, cls = "") {
    const zone = document.getElementById("click-zone");
    if (!zone) return;
    const el = document.createElement("div");
    el.className = `float-text ${cls}`;
    el.textContent = text;
    el.style.cssText = `color:${color};left:${35+Math.random()*30}%;top:${30+Math.random()*30}%`;
    zone.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

// ── SYNC UI ──
function syncUI(p) {
    player = p;
    document.getElementById("coins-display").textContent = p.coins;
    document.getElementById("level-display").textContent = p.level;
    document.getElementById("luck-display").textContent  = p.luck;
    document.getElementById("current-power").textContent = p.power;
    document.getElementById("auto-display").textContent  = p.auto_level;
    document.getElementById("xp-text").textContent = `${p.xp} / ${p.max_xp}`;
    document.getElementById("xp-bar").style.width  = `${(p.xp / p.max_xp) * 100}%`;
    document.getElementById("bag-count").textContent = p.bag_count;
    document.getElementById("bag-max").textContent   = p.max_bag;
    document.getElementById("bag-bar").style.width   = `${(p.bag_count / p.max_bag) * 100}%`;

    const s = p.current_stone;
    document.getElementById("rock-name").textContent = s.name;
    document.getElementById("rock-hp").textContent   = Math.max(0, s.hp);
    document.getElementById("hp-bar").style.width    = `${Math.max(0, s.hp / s.max_hp) * 100}%`;
    const img = document.getElementById("rock-image");
    if (img.dataset.rockId !== s.id) {
        img.dataset.rockId = s.id;
        img.src = `/static/images/${s.id}.png`;
    }
    document.getElementById("rock-halo").style.background =
        `radial-gradient(circle, ${s.color}18 0%, transparent 70%)`;

    // Престиж
    const prestigeRow = document.getElementById("prestige-row");
    if (p.prestige > 0) {
        prestigeRow.style.display = "flex";
        document.getElementById("prestige-display").textContent = `${p.prestige} ⭐`;
    }
    const prestigeBtn = document.getElementById("prestige-btn");
    const prestigeCost = p.prestige_cost;
    document.getElementById("prestige-cost").textContent = prestigeCost.toLocaleString();
    document.getElementById("prestige-cost-modal").textContent = prestigeCost.toLocaleString();
    if (p.level >= 10) {
        prestigeBtn.style.display = "block";
    }

    // Сканер
    const scannerHint = document.getElementById("scanner-hint");
    if (p.next_stone_id && p.scanner_level > 0) {
        scannerHint.style.display = "block";
        const cfg = ROCKS_CONFIG_DATA[p.next_stone_id];
        document.getElementById("scanner-rock-name").textContent =
            cfg ? cfg.name : p.next_stone_id;
        document.getElementById("scanner-rock-name").style.color =
            cfg ? cfg.color : "var(--cyan)";
    } else {
        scannerHint.style.display = "none";
    }

    renderInventory(p.inventory);
    renderShop(p);
    renderCollection(p);
    renderMarket(p.market_multipliers);
}

// ── INVENTORY ──
function renderInventory(inventory) {
    const list = document.getElementById("inventory-list");
    list.innerHTML = "";
    const items = Object.entries(inventory).filter(([, c]) => c > 0);
    if (!items.length) {
        list.innerHTML = `<p class="inv-empty">— рюкзак пуст —</p>`;
        return;
    }
    for (const [id, count] of items) {
        const cfg = ROCKS_CONFIG_DATA[id];
        const mult = (player.market_multipliers?.[id] ?? 1.0);
        const price = Math.round(cfg.price * mult);
        const row = document.createElement("div");
        row.className = "inv-row";
        row.style.borderLeftColor = cfg.color;
        row.innerHTML = `
            <div class="inv-row-left">
                <img src="/static/images/${id}.png" onerror="this.onerror=null;this.src='/static/images/stone.png'">
                <span>${cfg.name}</span>
            </div>
            <span class="inv-row-right">${count} шт. · <span style="color:${mult>1?'var(--green)':mult<1?'var(--red)':'inherit'}">${price} ◈</span></span>
        `;
        list.appendChild(row);
    }
}

// ── SHOP ──
const UPGRADE_COST = {
    power:     p => Math.floor(100  * (p.power ** 1.8)),
    bag:       p => Math.floor(150  * (p.bag_level ** 1.5)),
    luck:      p => Math.floor(250  * ((p.luck + 1) ** 2)),
    auto:      p => Math.floor(300  * ((p.auto_level + 1) ** 1.9)),
    explosive: p => Math.floor(500  * ((p.explosive_level + 1) ** 2)),
    scanner:   p => Math.floor(800  * ((p.scanner_level + 1) ** 1.7)),
    smelter:   p => Math.floor(600  * ((p.smelter_level + 1) ** 1.8)),
    magnet:    p => Math.floor(1000 * ((p.magnet_level + 1) ** 2)),
};

function renderShop(p) {
    document.querySelectorAll(".shop-card").forEach(card => {
        const type = card.dataset.type;
        const req  = parseInt(card.dataset.req ?? "1");
        const btn  = card.querySelector(".btn-buy");
        const cost = UPGRADE_COST[type]?.(p) ?? 0;
        if (p.level < req) {
            card.classList.add("locked");
            btn.textContent = `Ур.${req} 🔒`;
        } else {
            card.classList.remove("locked");
            btn.textContent = `${cost} ◈`;
        }
    });
}

// ── COLLECTION ──
function renderCollection(p) {
    const grid = document.getElementById("collection-grid");
    grid.innerHTML = "";
    for (const [id, cfg] of Object.entries(ROCKS_CONFIG_DATA)) {
        const mined    = p.mined_stats[id] ?? 0;
        const unlocked = mined > 0 || id === "stone";
        const item = document.createElement("div");
        item.className = `col-item ${unlocked ? "unlocked" : "locked"}`;
        if (unlocked) {
            item.style.boxShadow = `inset 0 0 18px ${cfg.color}18`;
            item.style.borderColor = `${cfg.color}28`;
        }
        item.innerHTML = `
            <div class="col-img"><img src="/static/images/${id}.png" onerror="this.onerror=null;this.src='/static/images/stone.png'"></div>
            <div class="col-name">${cfg.name}</div>
            <div class="col-stats">${unlocked ? `${mined}× · ${cfg.price}◈` : "???"}</div>
        `;
        grid.appendChild(item);
    }
}

// ── MARKET ──
function renderMarket(multipliers) {
    if (!multipliers) return;
    const list = document.getElementById("market-list");
    list.innerHTML = "";
    const entries = Object.entries(multipliers)
        .filter(([, m]) => m !== 1.0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
    for (const [id, mult] of entries) {
        const cfg = ROCKS_CONFIG_DATA[id];
        if (!cfg) continue;
        const cls = mult > 1.2 ? "market-up" : mult < 0.8 ? "market-down" : "market-flat";
        const arrow = mult > 1.2 ? "▲" : mult < 0.8 ? "▼" : "─";
        const row = document.createElement("div");
        row.className = `market-row ${cls}`;
        row.innerHTML = `<span>${cfg.name}</span><span>${arrow} ×${mult.toFixed(2)}</span>`;
        list.appendChild(row);
    }
    if (!entries.length) {
        list.innerHTML = `<div class="market-row market-flat"><span>Всё по базовой цене</span></div>`;
    }
}

// ── MARKET TIMER ──
async function marketTick() {
    marketTimerSeconds--;
    if (marketTimerSeconds <= 0) {
        marketTimerSeconds = 300;
        try {
            const data = await api("/api/market/update", {});
            syncUI(data.player);
            toast("📈 Рынок обновился!");
        } catch(e) {}
    }
    const m = Math.floor(marketTimerSeconds / 60);
    const s = marketTimerSeconds % 60;
    document.getElementById("market-timer").textContent = `${m}:${s.toString().padStart(2,"0")}`;
}
setInterval(marketTick, 1000);

// ── TABS ──
document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
    });
});

// ── MINING ──
async function handleClick() {
    if (minigameActive) return;
    const card = document.getElementById("rock-card");
    card.classList.add("shake");
    setTimeout(() => card.classList.remove("shake"), 160);
    try {
        const data = await api("/api/click", {});
        if (data.error) { toast(data.message); return; }
        syncUI(data.player);

        if (data.is_explosion) {
            card.classList.add("exploding");
            setTimeout(() => card.classList.remove("exploding"), 250);
            floatText(`💥 ВЗРЫВ −${data.damage_dealt}`, "var(--orange)", "explosion");
            spawnParticles("#ff7c2a", 16);
        } else {
            const dmgColor = data.is_crit ? "#ffc840" : "#ff3d5a";
            const label    = data.is_crit ? `⚡ КРИТ −${data.damage_dealt}` : `−${data.damage_dealt}`;
            floatText(label, dmgColor);
            spawnParticles(data.player.current_stone.color, data.is_crit ? 12 : 5);
        }

        if (data.mined)      toast(`✦ Добыто: ${data.reward_name}`);
        if (data.leveled_up) { document.getElementById("modal-new-level").textContent = data.player.level; openModal("modal-levelup"); }
        if (data.minigame)   triggerMinigame(data.minigame);
    } catch(e) { console.error("click error", e); }
}

document.getElementById("mine-btn").addEventListener("click", handleClick);
document.getElementById("rock-card").addEventListener("click", handleClick);

// ── SELL ──
document.getElementById("sell-btn").addEventListener("click", async () => {
    try {
        const data = await api("/api/sell", {});
        syncUI(data.player);
        toast(`◈ Продано на ${data.earned} монет`);
    } catch(e) {}
});

// ── UPGRADES ──
document.querySelectorAll(".btn-buy").forEach(btn => {
    btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
            const data = await api("/api/upgrade", { type: btn.dataset.type });
            toast(data.message);
            if (data.success) syncUI(data.player);
        } catch(e) {}
    });
});

// ── PRESTIGE ──
document.getElementById("prestige-btn").addEventListener("click", () => {
    openModal("modal-prestige");
});
document.getElementById("confirm-prestige-btn").addEventListener("click", async () => {
    closeModal("modal-prestige");
    try {
        const data = await api("/api/prestige", {});
        toast(data.message);
        syncUI(data.player);
    } catch(e) {}
});

// ── AUTO MINE ──
setInterval(async () => {
    if (minigameActive || !player.auto_level) return;
    try {
        const data = await api("/api/auto_mine", {});
        if (!data.success) return;
        syncUI(data.player);
        floatText(`−${player.auto_level}`, "#00e5ff");
        if (data.mined)      toast(`🤖 Бур: ${data.reward_name}`);
        if (data.leveled_up) { document.getElementById("modal-new-level").textContent = data.player.level; openModal("modal-levelup"); }
        if (data.minigame)   triggerMinigame(data.minigame);
    } catch(e) {}
}, 1000);

// ════════════════════════════════════════
// МИНИ-ИГРЫ
// ════════════════════════════════════════

function triggerMinigame(type) {
    minigameActive = true;
    switch(type) {
        case "runner":     openModal("modal-runner");     startRunner();     break;
        case "tunnels":    document.getElementById("tunnels-status").textContent = "Сделай выбор!"; openModal("modal-tunnels"); break;
        case "stopbar":    openModal("modal-stopbar");    startStopbar();    break;
        case "minesweeper":openModal("modal-minesweeper");startMinesweeper();break;
        case "rapidclick": openModal("modal-rapidclick"); startRapidClick(); break;
        case "codesafe":   openModal("modal-codesafe");   startCodeSafe();   break;
        default:           openModal("modal-tunnels");    break;
    }
}

async function sendMinigameResult(type, success) {
    try {
        const data = await api("/api/minigame/result", { type, success });
        toast(data.message);
        syncUI(data.player);
        if (data.leveled_up) { document.getElementById("modal-new-level").textContent = data.player.level; openModal("modal-levelup"); }
    } catch(e) {}
    finally { minigameActive = false; }
}

// 1. RUNNER
function startRunner() {
    const canvas = document.getElementById("runnerCanvas");
    const ctx = canvas.getContext("2d");
    const status = document.getElementById("runner-status");
    let ticks = 12*60, y = 110, vy = 0, jumping = false, obstacles = [], spawnT = 0;
    const jump = () => { if (!jumping) { vy = -10; jumping = true; } };
    const onKey = e => { if (e.code === "Space") { e.preventDefault(); jump(); } };
    canvas.addEventListener("click", jump);
    window.addEventListener("keydown", onKey);
    function cleanup() { canvas.removeEventListener("click", jump); window.removeEventListener("keydown", onKey); }
    function frame() {
        ticks--;
        if (ticks <= 0) { cleanup(); closeModal("modal-runner"); sendMinigameResult("runner", true); return; }
        vy += 0.6; y += vy;
        if (y >= 110) { y = 110; vy = 0; jumping = false; }
        spawnT++;
        if (spawnT > 90) { if (Math.random() > 0.35) obstacles.push({x:520,w:14,h:24+Math.random()*10}); spawnT=0; }
        for (let i = obstacles.length-1; i >= 0; i--) {
            obstacles[i].x -= 4;
            const o = obstacles[i];
            if (50 < o.x+o.w && 70 > o.x && y+20 > 130-o.h) { cleanup(); closeModal("modal-runner"); sendMinigameResult("runner", false); return; }
            if (o.x < -20) obstacles.splice(i, 1);
        }
        ctx.clearRect(0,0,520,160);
        ctx.strokeStyle="rgba(0,229,255,0.2)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(0,130); ctx.lineTo(520,130); ctx.stroke();
        ctx.fillStyle="#ffc840"; ctx.fillRect(50,y,20,20);
        ctx.fillStyle="#ff3d5a"; obstacles.forEach(o => ctx.fillRect(o.x,130-o.h,o.w,o.h));
        status.textContent = `Продержись: ${Math.ceil(ticks/60)} сек.`;
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

// 2. TUNNELS
function chooseTunnel(i) {
    const lucky = Math.floor(Math.random()*3);
    const status = document.getElementById("tunnels-status");
    if (i === lucky) {
        status.innerHTML = `<span style="color:var(--green)">✦ СУНДУК!</span>`;
        setTimeout(() => { closeModal("modal-tunnels"); sendMinigameResult("tunnels", true); }, 1400);
    } else {
        status.innerHTML = `<span style="color:var(--red)">✗ Пусто...</span>`;
        setTimeout(() => { closeModal("modal-tunnels"); sendMinigameResult("tunnels", false); }, 1400);
    }
}

// 3. STOPBAR — останови шкалу в зелёной зоне
function startStopbar() {
    const cursor = document.getElementById("stopbar-cursor");
    const btn    = document.getElementById("stopbar-btn");
    const status = document.getElementById("stopbar-status");
    status.textContent = "";
    let pos = 0, dir = 1, speed = 1.2, raf;

    function animate() {
        pos += dir * speed;
        if (pos >= 100) { pos = 100; dir = -1; }
        if (pos <= 0)   { pos = 0;   dir = 1;  }
        cursor.style.left = `${pos}%`;
        raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    function stop() {
        cancelAnimationFrame(raf);
        btn.removeEventListener("click", stop);
        window.removeEventListener("keydown", onKey);
        const win = pos >= 35 && pos <= 65;
        status.innerHTML = win
            ? `<span style="color:var(--green)">✦ Точно! +награда</span>`
            : `<span style="color:var(--red)">✗ Мимо! Позиция: ${Math.round(pos)}%</span>`;
        setTimeout(() => { closeModal("modal-stopbar"); sendMinigameResult("stopbar", win); }, 1500);
    }

    const onKey = e => { if (e.code === "Space") { e.preventDefault(); stop(); } };
    btn.addEventListener("click", stop);
    window.addEventListener("keydown", onKey);
}

// 4. MINESWEEPER — 4×4 сетка, 3 мины, открой 5 безопасных
function startMinesweeper() {
    const grid   = document.getElementById("minesweeper-grid");
    const status = document.getElementById("minesweeper-status");
    grid.innerHTML = "";
    status.textContent = "Открой 5 клеток без мин!";

    const SIZE = 16, MINES = 3, TARGET = 5;
    const mineSet = new Set();
    while (mineSet.size < MINES) mineSet.add(Math.floor(Math.random() * SIZE));

    let safeOpened = 0, done = false;

    for (let i = 0; i < SIZE; i++) {
        const cell = document.createElement("div");
        cell.className = "mine-cell";
        cell.addEventListener("click", () => {
            if (done || cell.classList.contains("safe") || cell.classList.contains("boom")) return;
            if (mineSet.has(i)) {
                cell.classList.add("boom"); cell.textContent = "💣";
                done = true;
                status.innerHTML = `<span style="color:var(--red)">💥 Мина! Проигрыш.</span>`;
                setTimeout(() => { closeModal("modal-minesweeper"); sendMinigameResult("minesweeper", false); }, 1500);
            } else {
                cell.classList.add("safe"); cell.textContent = "💎";
                safeOpened++;
                status.textContent = `Открыто: ${safeOpened} / ${TARGET}`;
                if (safeOpened >= TARGET) {
                    done = true;
                    status.innerHTML = `<span style="color:var(--green)">✦ Победа!</span>`;
                    setTimeout(() => { closeModal("modal-minesweeper"); sendMinigameResult("minesweeper", true); }, 1200);
                }
            }
        });
        grid.appendChild(cell);
    }
}

// 5. RAPID CLICK — 15 кликов за 3 секунды
function startRapidClick() {
    const counter = document.getElementById("rapid-counter");
    const timerBar = document.getElementById("rapid-timer-bar");
    const btn    = document.getElementById("rapid-btn");
    const status = document.getElementById("rapid-status");
    status.textContent = "";
    counter.textContent = "0 / 15";
    timerBar.style.width = "100%";

    let clicks = 0, done = false;
    const TARGET = 15, DURATION = 3000;
    const start = Date.now();

    const timerInterval = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
        timerBar.style.width = `${pct}%`;
        if (elapsed >= DURATION && !done) {
            done = true;
            clearInterval(timerInterval);
            btn.removeEventListener("click", onClick);
            const win = clicks >= TARGET;
            status.innerHTML = win
                ? `<span style="color:var(--green)">✦ ${clicks} кликов — Победа!</span>`
                : `<span style="color:var(--red)">✗ Только ${clicks} кликов — Проигрыш</span>`;
            setTimeout(() => { closeModal("modal-rapidclick"); sendMinigameResult("rapidclick", win); }, 1500);
        }
    }, 50);

    function onClick() {
        if (done) return;
        clicks++;
        counter.textContent = `${clicks} / ${TARGET}`;
        if (clicks >= TARGET) {
            done = true;
            clearInterval(timerInterval);
            btn.removeEventListener("click", onClick);
            status.innerHTML = `<span style="color:var(--green)">✦ Победа!</span>`;
            setTimeout(() => { closeModal("modal-rapidclick"); sendMinigameResult("rapidclick", true); }, 800);
        }
    }
    btn.addEventListener("click", onClick);
}

// 6. CODE SAFE — угадай 3-значный код за 4 попытки
function startCodeSafe() {
    const attemptsEl = document.getElementById("safe-attempts");
    const input      = document.getElementById("safe-input");
    const guessBtn   = document.getElementById("safe-guess-btn");
    const status     = document.getElementById("safe-status");
    const triesEl    = document.getElementById("safe-tries");

    attemptsEl.innerHTML = "";
    input.value = "";
    const SECRET = Math.floor(Math.random() * 900) + 100; // 100-999
    let tries = 4, done = false;
    triesEl.textContent = tries;
    status.textContent = `Попыток осталось: ${tries}`;

    function guess() {
        if (done) return;
        const val = parseInt(input.value);
        if (isNaN(val) || val < 100 || val > 999) { toast("Введи число от 100 до 999"); return; }

        tries--;
        triesEl.textContent = tries;
        input.value = "";

        let hint = "";
        if (val === SECRET) {
            hint = "✦ ВЕРНО!";
            done = true;
        } else {
            const diff = Math.abs(val - SECRET);
            if (diff <= 10)       hint = val < SECRET ? "↑ Очень близко!" : "↓ Очень близко!";
            else if (diff <= 50)  hint = val < SECRET ? "↑ Близко"        : "↓ Близко";
            else if (diff <= 150) hint = val < SECRET ? "↑ Теплее"        : "↓ Теплее";
            else                  hint = val < SECRET ? "↑ Холодно"       : "↓ Холодно";
        }

        const row = document.createElement("div");
        row.className = "safe-attempt-row";
        row.innerHTML = `<span>${val}</span><span class="safe-hint">${hint}</span>`;
        attemptsEl.appendChild(row);

        if (done) {
            status.innerHTML = `<span style="color:var(--green)">✦ Код взломан!</span>`;
            guessBtn.removeEventListener("click", guess);
            setTimeout(() => { closeModal("modal-codesafe"); sendMinigameResult("codesafe", true); }, 1200);
        } else if (tries <= 0) {
            status.innerHTML = `<span style="color:var(--red)">✗ Код был: ${SECRET}</span>`;
            guessBtn.removeEventListener("click", guess);
            setTimeout(() => { closeModal("modal-codesafe"); sendMinigameResult("codesafe", false); }, 1800);
        } else {
            status.textContent = `Попыток осталось: ${tries}`;
        }
    }

    guessBtn.addEventListener("click", guess);
    input.addEventListener("keydown", e => { if (e.key === "Enter") guess(); });
}

// ── BOOTSTRAP ──
syncUI({
    coins: 0, level: 1, xp: 0, max_xp: 100,
    power: 1, luck: 0, bag_level: 1, max_bag: 20,
    bag_count: 0, auto_level: 0,
    explosive_level: 0, scanner_level: 0, smelter_level: 0, magnet_level: 0,
    prestige: 0, prestige_bonus: 1.0, prestige_cost: 50000,
    next_stone_id: null,
    market_multipliers: {},
    inventory: {}, mined_stats: {},
    achievements: {}, achievements_unlocked: 0,
    current_stone: { id: "stone", name: "Камень", hp: 5, max_hp: 5, price: 1, color: "#94a3b8" }
});
