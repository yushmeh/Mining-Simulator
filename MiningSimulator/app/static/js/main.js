let playerStats = {};
let isMinigameActive = false;

function showToast(msg) {
    const n = document.getElementById('game-notification');
    if(n) { n.innerText = msg; n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 2000); }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// --- Логика Переключения Табов (Иконки) ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// Обновление всего интерфейса
function syncUI(player) {
    playerStats = player;

    document.getElementById('coins-display').innerText = player.coins;
    document.getElementById('level-display').innerText = player.level;
    document.getElementById('xp-text').innerText = `${player.xp} / ${player.max_xp}`;
    document.getElementById('xp-bar-inner').style.width = `${(player.xp / player.max_xp) * 100}%`;

    document.getElementById('rock-hp').innerText = Math.max(0, player.current_stone.hp);
    document.getElementById('rock-name').innerText = player.current_stone.name;
    document.getElementById('current-power').innerText = player.power;
    document.getElementById('bag-count').innerText = player.bag_count;
    document.getElementById('bag-max').innerText = player.max_bag;

    let maxHp = player.current_stone.max_hp || 5;
    document.getElementById('hp-bar').style.width = `${(player.current_stone.hp / maxHp) * 100}%`;
    document.getElementById('rock-image').src = `/static/images/${player.current_stone.id}.png`;

    updateShopUI(player);
    updateInventoryUI(player.inventory);
    renderCollectionUI(player);
}

// Отрендерить содержимое инвентаря в табе с иконками руд
function updateInventoryUI(inventory) {
    const container = document.getElementById('inventory-ui-list');
    if (!container) return;
    container.innerHTML = '';

    let itemsExist = false;

    Object.keys(ROCKS_CONFIG_DATA).forEach(rockId => {
        const count = inventory[rockId] || 0;
        if (count > 0) {
            itemsExist = true;
            const config = ROCKS_CONFIG_DATA[rockId];

            const row = document.createElement('div');
            row.className = 'inventory-row';
            row.style.borderLeftColor = config.color;

            // Формируем внутреннюю разметку: заменяем эмодзи на картинку руды
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="/static/images/${rockId}.png"
                         onerror="this.onerror=null; this.src='/static/images/stone.png';"
                         style="width: 20px; height: 20px; object-fit: contain; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));">
                    <span>${config.name}</span>
                </div>
                <span style="color: #94a3b8; display: inline-flex; align-items: center;">
                    ${count} шт.
                    <small style="color:#64748b; margin-left: 5px; display: inline-flex; align-items: center;">
                        (по ${config.price} <img src="/static/images/coin.png" class="coin-icon" style="width:18px; height:18px; margin-right:0; margin-left:4px;">)
                    </small>
                </span>
            `;
            container.appendChild(row);
        }
    });

    if (!itemsExist) {
        container.innerHTML = '<p style="text-align:center; color:#64748b; padding-top: 30px;">Рюкзак пуст. Начните копать руду!</p>';
    }
}

function updateShopUI(player) {
    const types = ['power', 'bag', 'luck', 'auto'];
    types.forEach(type => {
        const card = document.querySelector(`.shop-card[id-upgrade="${type}"]`);
        const btn = document.getElementById(`upgrade-${type}-btn`);
        if (!card || !btn) return;

        let cost = 0;
        if (type === 'power') cost = Math.floor(100 * (player.power ** 1.8));
        else if (type === 'bag') cost = Math.floor(150 * (player.bag_level ** 1.5));
        else if (type === 'luck') cost = Math.floor(250 * ((player.luck + 1) ** 2));
        else if (type === 'auto') cost = Math.floor(300 * ((player.auto_level + 1) ** 1.9));

        btn.innerHTML = `${cost} <img src="/static/images/coin.png" class="coin-icon button-icon" style="width:14px; height:14px; margin: 0 0 0 4px;">`;

        const reqLvl = parseInt(card.dataset.req || "1");
        if (player.level < reqLvl) {
            card.classList.add('locked');
            btn.innerText = `Ур. ${reqLvl} 🔒`;
        } else {
            card.classList.remove('locked');
        }
    });
}

function renderCollectionUI(player) {
    const grid = document.getElementById('collection-ui-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.keys(ROCKS_CONFIG_DATA).forEach(rockId => {
        const config = ROCKS_CONFIG_DATA[rockId];
        const timesMined = player.mined_stats[rockId] || 0;
        const isUnlocked = timesMined > 0 || rockId === 'stone';

        const item = document.createElement('div');
        item.className = `collection-item ${isUnlocked ? '' : 'locked'}`;
        if(isUnlocked) {
            item.style.boxShadow = `inset 0 0 15px ${config.color}22, 0 4px 10px rgba(0,0,0,0.3)`;
            item.style.borderColor = `${config.color}44`;
        }

        const imgHtml = isUnlocked
            ? `<img src="/static/images/${rockId}.png" onerror="this.onerror=null; this.src='/static/images/stone.png';">`
            : `❓`;

        item.innerHTML = `
            <div class="collection-img-wrapper" style="color: ${config.color}">${imgHtml}</div>
            <h4>${isUnlocked ? config.name : 'Неизвестно'}</h4>
            <div class="collection-stats">
                ${isUnlocked ? `Ценность: ${config.price} 🪙<br>Добыто: ${timesMined} шт.` : `Откроется на Ур. ${config.min_level}`}
            </div>
        `;
        grid.appendChild(item);
    });
}

function createFloatingText(text, color = '#f1f5f9') {
    const zone = document.getElementById('click-zone');
    if(!zone) return;
    const txt = document.createElement('div');
    txt.className = 'floating-text';
    txt.innerText = text;
    txt.style.color = color;
    txt.style.left = `${40 + Math.random() * 20}%`;
    txt.style.top = `${40 + Math.random() * 20}%`;
    zone.appendChild(txt);
    setTimeout(() => txt.remove(), 800);
}

function handleMiningClick() {
    if (isMinigameActive) return;

    const card = document.getElementById('rock-card');
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 150);

    fetch('/api/click', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
        if (data.error) { showToast(data.message); return; }
        syncUI(data.player);

        const dmgColor = data.is_crit ? '#fbbf24' : '#ef4444';
        const dmgPrefix = data.is_crit ? '⚡ КРИТ ' : '';
        createFloatingText(`${dmgPrefix}-${data.damage_dealt} HP`, dmgColor);

        if (data.mined) showToast(`🎉 Найдена руда: ${data.reward_name}!`);
        if (data.leveled_up) {
            document.getElementById('modal-new-level').innerText = data.player.level;
            openModal('level-up-modal');
        }
        if (data.minigame) triggerMinigame(data.minigame);
    });
}

document.getElementById('rock-click-btn').addEventListener('click', handleMiningClick);
document.getElementById('rock-card').addEventListener('click', handleMiningClick);

// Продажа ресурсов
document.getElementById('sell-all-btn').addEventListener('click', () => {
    fetch('/api/sell', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
        syncUI(data.player);
        showToast(`💰 Все ресурсы успешно проданы за ${data.earned} 🪙!`);
    });
});

// Улучшения
document.querySelectorAll('.buy-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const type = e.target.dataset.type;
        fetch('/api/buy_upgrade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type })
        })
        .then(res => res.json())
        .then(data => {
            showToast(data.message);
            if (data.success) syncUI(data.player);
        });
    });
});

// Авто-майнинг таймер
setInterval(() => {
    if (isMinigameActive || !playerStats.auto_level || playerStats.auto_level <= 0) return;

    fetch('/api/auto_mine', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
        if (!data.success) return;
        syncUI(data.player);
        createFloatingText(`-${data.player.auto_level} HP`, '#38bdf8');

        if (data.mined) showToast(`🤖 Бур нашел руду: ${data.reward_name}!`);
        if (data.leveled_up) {
            document.getElementById('modal-new-level').innerText = data.player.level;
            openModal('level-up-modal');
        }
        if (data.minigame) triggerMinigame(data.minigame);
    });
}, 1000);


/* ================= МИНИ-ИГРЫ СИСТЕМЫ ================= */

function triggerMinigame(type) {
    isMinigameActive = true;
    if (type === 'runner') {
        openModal('runner-modal');
        startRunnerGame();
    } else if (type === 'tunnels') {
        document.getElementById('tunnels-status').innerText = 'Сделай свой выбор!';
        openModal('tunnels-modal');
    }
}

function sendMinigameResult(type, isWin) {
    fetch('/api/minigame_reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, success: isWin })
    })
    .then(res => res.json())
    .then(data => {
        showToast(data.message);
        syncUI(data.player);
        if (data.leveled_up) {
            document.getElementById('modal-new-level').innerText = data.player.level;
            openModal('level-up-modal');
        }
        isMinigameActive = false;
    });
}

// 1. Динозаврик
let runnerAnimationId;
function startRunnerGame() {
    const canvas = document.getElementById('runnerCanvas');
    const ctx = canvas.getContext('2d');
    const statusText = document.getElementById('runner-status');

    let gameTime = 12 * 60;
    let playerY = 110;
    let playerVelocityY = 0;
    let isJumping = false;
    const gravity = 0.6;

    let obstacles = [];
    let spawnTimer = 0;

    function jump() {
        if (!isJumping) {
            playerVelocityY = -10;
            isJumping = true;
        }
    }

    const keyHandler = (e) => { if(e.code === 'Space') jump(); };
    canvas.addEventListener('click', jump);
    window.addEventListener('keydown', keyHandler);

    function updateFrame() {
        gameTime--;
        if (gameTime <= 0) {
            window.removeEventListener('keydown', keyHandler);
            closeModal('runner-modal');
            sendMinigameResult('runner', true);
            return;
        }

        playerVelocityY += gravity;
        playerY += playerVelocityY;
        if (playerY >= 110) {
            playerY = 110;
            playerVelocityY = 0;
            isJumping = false;
        }

        spawnTimer++;
        if (spawnTimer > 90) {
            if (Math.random() > 0.4) obstacles.push({ x: 520, width: 15, height: 25 });
            spawnTimer = 0;
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].x -= 4;
            if (50 < obstacles[i].x + obstacles[i].width && 70 > obstacles[i].x && playerY + 20 > 135 - obstacles[i].height) {
                window.removeEventListener('keydown', keyHandler);
                closeModal('runner-modal');
                sendMinigameResult('runner', false);
                return;
            }
            if (obstacles[i].x < -20) obstacles.splice(i, 1);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#334155';
        ctx.beginPath(); ctx.moveTo(0, 130); ctx.lineTo(500, 130); ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(50, playerY, 20, 20);
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.fillText("💎", 53, playerY + 14);

        ctx.fillStyle = '#ef4444';
        obstacles.forEach(obs => { ctx.fillRect(obs.x, 130 - obs.height, obs.width, obs.height); });

        statusText.innerText = `Осталось продержаться: ${Math.ceil(gameTime / 60)} сек.`;
        runnerAnimationId = requestAnimationFrame(updateFrame);
    }
    runnerAnimationId = requestAnimationFrame(updateFrame);
}

// 2. Тоннели
function chooseTunnel(selectedIndex) {
    const luckyTunnel = Math.floor(Math.random() * 3);
    const statusText = document.getElementById('tunnels-status');

    if (selectedIndex === luckyTunnel) {
        statusText.innerHTML = "<span style='color:#10b981; font-weight:bold;'>🎉 Вы нашли сундук! Начисление награды...</span>";
        setTimeout(() => { closeModal('tunnels-modal'); sendMinigameResult('tunnels', true); }, 1500);
    } else {
        statusText.innerHTML = "<span style='color:#ef4444; font-weight:bold;'>💨 Тут пусто. Возвращаемся в шахту...</span>";
        setTimeout(() => { closeModal('tunnels-modal'); sendMinigameResult('tunnels', false); }, 1500);
    }
}

// Инициализация интерфейса
syncUI({
    coins: parseInt(document.getElementById('coins-display').innerText || "0"),
    level: 1, xp: 0, max_xp: 100, power: 1, luck: 0, bag_level: 1, max_bag: 20, bag_count: 0, auto_level: 0,
    inventory: {}, mined_stats: {}, current_stone: { id: 'stone', name: 'Камень', hp: 5, max_hp: 5, price: 1, color: '#94a3b8' }
});