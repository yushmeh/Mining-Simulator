const rockEmojis = {
    'stone': '🗿', 'coal': '⬛', 'iron': '🔩',
    'sapphire': '🔵', 'ruby': '🔴', 'amethyst': '🟣', 'diamond': '💠'
};

// Функция для показа красивого текстового уведомления внутри игры
function showToast(message) {
    const notification = document.getElementById('game-notification');
    if (!notification) return;
    notification.innerText = message;
    notification.classList.add('show');

    // Через 1.5 секунды уведомление плавно исчезнет
    setTimeout(() => {
        notification.classList.remove('show');
    }, 1500);
}

// --- Логика переключения Вкладок ---
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        button.classList.add('active');
        const targetTab = button.dataset.tab;
        document.getElementById(targetTab).classList.add('active');
    });
});

// Функция для обновления цифр в UI инвентаря
function updateInventory(inventory) {
    const coreRicks = ['stone', 'coal', 'iron', 'sapphire', 'ruby', 'amethyst', 'diamond'];
    coreRicks.forEach(rockId => {
        const el = document.getElementById(`inv-${rockId}`);
        if (el) {
            el.innerText = inventory[rockId] || 0;
        }
    });
}

// --- Клик по камню (Добыча) ---
document.getElementById('rock-click-btn').addEventListener('click', () => {
    const rockVisual = document.getElementById('rock-visual');
    const rockCard = document.getElementById('rock-card');
    const rockImage = document.getElementById('rock-image');

    if (rockVisual) {
        rockVisual.classList.add('shake');
        setTimeout(() => rockVisual.classList.remove('shake'), 100);
    }

    fetch('/api/click', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showToast(data.message);
            return;
        }

        // Обновляем базовые текстовые данные руды
        document.getElementById('rock-hp').innerText = Math.max(0, data.current_rock.hp);
        document.getElementById('rock-name').innerText = data.current_rock.name;

        // Переключаем класс карточки, чтобы сменился цвет рамки и полоски HP
        if (rockCard) {
            rockCard.className = `rock-card ${data.current_rock.id}`;
        }

        // 2. Рассчитываем полоску здоровья
        let maxHp = data.current_rock.max_hp || 5;
        let percent = (data.current_rock.hp / maxHp) * 100;
        document.getElementById('hp-bar').style.width = `${Math.max(0, Math.min(100, percent))}%`;

        // 3. Обновляем счетчики рюкзака
        document.getElementById('bag-count').innerText = data.total_items;
        document.getElementById('bag-limit').innerText = data.slots_limit;

        // 4. Мягко меняем картинку
        if (rockImage) {
            // Если картинки для угля/железа еще нет — сработает onerror (прописан в HTML)
            rockImage.src = `/static/images/${data.current_rock.id}.png`;
        }

        // 5. Если блок полностью уничтожен
        if (data.mined) {
            showToast(`🎉 Добыто: ${data.reward_name}!`);
            updateInventory(data.inventory);
            document.getElementById('hp-bar').style.width = '100%';
        }
    })
    .catch(err => {
        console.error("Критическая ошибка:", err);
        showToast("❌ Ошибка сервера при добыче!");
    });
});

// --- Продажа ресурсов ---
document.getElementById('sell-all-btn').addEventListener('click', () => {
    fetch('/api/sell', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('coins-display').innerText = data.coins;
            updateInventory(data.inventory);
            document.getElementById('bag-count').innerText = data.total_items;
            showToast(`💰 Ресурсы проданы! Получено: ${data.earned} 💰`);
        }
    });
});

// --- Магазин: Покупка кирок ---
document.querySelectorAll('.buy-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const pickaxeId = e.target.dataset.id;
        fetch('/api/buy_upgrade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ upgrade_id: pickaxeId, type: 'pickaxe' })
        })
        .then(res => res.json())
        .then(data => {
            showToast(data.message);
            if (data.success) setTimeout(() => location.reload(), 800);
        });
    });
});

// --- Магазин: Покупка рюкзаков ---
document.querySelectorAll('.buy-bag-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const upgradeId = e.target.dataset.id;
        fetch('/api/buy_upgrade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ upgrade_id: upgradeId, type: 'inventory' })
        })
        .then(res => res.json())
        .then(data => {
            showToast(data.message);
            if (data.success) setTimeout(() => location.reload(), 800);
        });
    });
});