"""
Чистая игровая логика — stateless функции.
"""

from __future__ import annotations

import random
import time
from core.models import Player, Stone, ROCKS, RockId

MINIGAME_TYPES = ("runner", "tunnels", "stopbar", "minesweeper", "rapidclick", "codesafe")

UPGRADE_REQUIREMENTS: dict[str, int] = {
    "power":     1,
    "bag":       2,
    "luck":      3,
    "auto":      4,
    "explosive": 5,
    "scanner":   5,
    "smelter":   6,
    "magnet":    7,
}

# Порог плавильни: продавать руды дешевле этой цены автоматически
SMELTER_THRESHOLDS = [0, 5, 16, 45, 130, 320, 800]


def generate_next_stone(player_level: int, luck_level: int, prestige_bonus: float = 1.0) -> Stone:
    candidates: list[RockId] = []
    weights: list[float] = []
    for rock_id, cfg in ROCKS.items():
        if player_level < cfg.min_level:
            continue
        candidates.append(rock_id)
        if rock_id == "stone":
            weight = max(5.0, cfg.base_chance - luck_level * 2.5)
        else:
            weight = cfg.base_chance * (1 + 0.25 * luck_level) * prestige_bonus
        weights.append(weight)
    chosen = random.choices(candidates or ["stone"], weights=weights or [1.0], k=1)[0]
    return Stone.from_id(chosen)


def _run_smelter(player: Player) -> int:
    """Авто-продаёт руды ниже порога плавильни. Возвращает заработок."""
    if player.smelter_level <= 0:
        return 0
    threshold = SMELTER_THRESHOLDS[min(player.smelter_level, len(SMELTER_THRESHOLDS) - 1)]
    earned = 0
    for rock_id, count in player.inventory.items():
        if count > 0:
            base_price = ROCKS[rock_id].price
            if base_price <= threshold:
                market_mult = player.market_multipliers.get(rock_id, 1.0)
                earned += int(count * base_price * market_mult)
                player.inventory[rock_id] = 0
    player.coins += earned
    return earned


def _mine_stone(player: Player) -> tuple[bool, str]:
    """Добывает камень, обновляет инвентарь и генерирует следующий. Возвращает (mined, reward_name)."""
    if player.bag_count >= player.max_bag:
        return False, ""

    stone = player.current_stone
    reward_name = stone.name
    player.inventory[stone.id] += 1
    player.mined_stats[stone.id] += 1

    # Магнит — шанс двойной добычи
    if player.magnet_level > 0:
        magnet_chance = player.magnet_level * 0.08
        if random.random() < magnet_chance and player.bag_count < player.max_bag:
            player.inventory[stone.id] += 1

    xp_bonus = ROCKS[stone.id].price * 2
    player.add_xp(xp_bonus)

    # Плавильня
    _run_smelter(player)

    # Генерируем следующий камень
    next_stone = generate_next_stone(player.level, player.luck, player.prestige_bonus)
    player.current_stone = next_stone

    # Сканер: подсказка о следующем после следующего
    if player.scanner_level > 0:
        preview = generate_next_stone(player.level, player.luck, player.prestige_bonus)
        player.next_stone_id = preview.id
    else:
        player.next_stone_id = None

    player.achievements.check_and_update(player)
    return True, reward_name


def process_click(player: Player) -> dict:
    if player.bag_count >= player.max_bag:
        return {"error": True, "message": "🎒 Рюкзак полон! Продайте ресурсы."}

    crit_chance = min(0.5, player.luck * 0.05)
    is_crit = random.random() < crit_chance
    base_damage = player.power * 3 if is_crit else player.power

    # Взрывчатка: каждый N-й удар — взрыв
    player.click_counter += 1
    is_explosion = False
    if player.explosive_level > 0:
        explosion_every = max(3, 10 - player.explosive_level)
        if player.click_counter % explosion_every == 0:
            base_damage = player.power * 10
            is_explosion = True

    damage = base_damage
    player.current_stone.hp -= damage

    mined = False
    reward_name = ""
    leveled_up = player.add_xp(random.randint(1, 3))
    minigame: str | None = None

    if player.current_stone.hp <= 0:
        mined, reward_name = _mine_stone(player)
        if player.add_xp(0):  # already added in _mine_stone
            pass
        leveled_up = leveled_up  # keep existing flag

        if random.random() < 0.025:
            minigame = random.choice(MINIGAME_TYPES)

    return {
        "error": False,
        "mined": mined,
        "is_crit": is_crit,
        "is_explosion": is_explosion,
        "damage_dealt": damage,
        "reward_name": reward_name,
        "leveled_up": leveled_up,
        "minigame": minigame,
    }


def process_auto_mine(player: Player) -> dict:
    if player.auto_level <= 0:
        return {"success": False, "message": "Авто-майнинг не куплен"}
    if player.bag_count >= player.max_bag:
        return {"success": False, "message": "🎒 Рюкзак полон!"}

    player.current_stone.hp -= player.auto_level

    mined = False
    reward_name = ""
    leveled_up = player.add_xp(1)
    minigame: str | None = None

    if player.current_stone.hp <= 0:
        mined, reward_name = _mine_stone(player)
        if random.random() < 0.01:
            minigame = random.choice(MINIGAME_TYPES)

    return {
        "success": True,
        "mined": mined,
        "reward_name": reward_name,
        "leveled_up": leveled_up,
        "minigame": minigame,
    }


def process_sell(player: Player) -> int:
    earned = 0
    for rock_id, count in player.inventory.items():
        if count > 0:
            market_mult = player.market_multipliers.get(rock_id, 1.0)
            earned += int(ROCKS[rock_id].price * count * market_mult)
            player.inventory[rock_id] = 0
    player.coins += earned
    return earned


def process_upgrade(player: Player, upgrade_type: str) -> dict:
    min_lvl = UPGRADE_REQUIREMENTS.get(upgrade_type)
    if min_lvl is None:
        return {"success": False, "message": "❌ Неизвестный апгрейд"}
    if player.level < min_lvl:
        return {"success": False, "message": f"🔒 Требуется {min_lvl} уровень!"}

    cost = player.upgrade_cost(upgrade_type)
    if player.coins < cost:
        return {"success": False, "message": "❌ Недостаточно монет!"}

    player.coins -= cost
    match upgrade_type:
        case "power":     player.power += 1
        case "luck":      player.luck += 1
        case "bag":       player.bag_level += 1
        case "auto":      player.auto_level += 1
        case "explosive": player.explosive_level += 1
        case "scanner":   player.scanner_level += 1
        case "smelter":   player.smelter_level += 1
        case "magnet":    player.magnet_level += 1

    return {"success": True, "message": "✅ Успешно улучшено!"}


def process_prestige(player: Player) -> dict:
    cost = player.prestige_cost()
    if player.coins < cost:
        return {"success": False, "message": f"❌ Нужно {cost} монет для престижа!"}
    if player.level < 10:
        return {"success": False, "message": "🔒 Нужен 10 уровень для престижа!"}

    player.prestige += 1
    player.prestige_bonus = 1.0 + player.prestige * 0.5

    # Сброс прогресса, сохраняем монеты частично
    kept_coins = player.coins // 10
    player.coins = kept_coins
    player.level = 1
    player.xp = 0
    player.power = 1
    player.luck = 0
    player.bag_level = 1
    player.auto_level = 0
    player.explosive_level = 0
    player.scanner_level = 0
    player.smelter_level = 0
    player.magnet_level = 0
    player.click_counter = 0
    player.inventory = {k: 0 for k in ROCKS}
    player.current_stone = Stone.from_id("stone")
    player.next_stone_id = None

    return {
        "success": True,
        "message": f"⭐ Престиж {player.prestige}! Бонус удачи ×{player.prestige_bonus:.1f}. Сохранено {kept_coins} монет.",
    }


def process_market_update(player: Player) -> dict:
    """Обновляет рыночные множители цен случайным образом."""
    new_multipliers = {}
    for rock_id in ROCKS:
        # Цена колеблется от 0.5× до 2.0×
        new_multipliers[rock_id] = round(random.uniform(0.5, 2.0), 2)
    player.market_multipliers = new_multipliers
    return {"success": True, "multipliers": new_multipliers}


def process_minigame_reward(player: Player, success: bool) -> dict:
    if not success:
        return {"success": False, "message": "💨 В следующий раз повезёт!"}

    gold = player.level * random.randint(50, 150)
    xp = player.level * 30
    player.coins += gold
    leveled_up = player.add_xp(xp)

    return {
        "success": True,
        "message": f"🏆 Победа! +{gold} монет и +{xp} XP!",
        "leveled_up": leveled_up,
    }
