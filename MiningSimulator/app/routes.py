import random
from flask import render_template, jsonify, request, session
from app import app
from app.models import Player, ROCKS_CONFIG
from app.game_logic import generate_next_stone

players_db = {}


def get_current_player():
    if 'player_id' not in session:
        import uuid
        session['player_id'] = str(uuid.uuid4())
    p_id = session['player_id']
    if p_id not in players_db:
        players_db[p_id] = Player()
    return players_db[p_id]


@app.route('/')
def index():
    player = get_current_player()
    return render_template('index.html', player=player, rocks_config=ROCKS_CONFIG)


@app.route('/api/click', methods=['POST'])
def click():
    player = get_current_player()
    stone = player.current_stone

    if player.get_total_inventory_count() >= player.get_max_bag_capacity():
        return jsonify({'error': True, 'message': '🎒 Рюкзак полон! Продайте ресурсы.'})

    # Расчет Квантовой Удачи (Крит х3)
    # Шанс крита = luck * 5%, максимум 50%
    crit_chance = min(0.5, player.luck * 0.05)
    is_crit = random.random() < crit_chance
    damage = player.power * 3 if is_crit else player.power

    stone.hp -= damage
    mined = False
    reward_name = ""
    leveled_up = False
    minigame_trigger = None

    # Опыт за удар
    leveled_up = player.add_xp(random.randint(1, 3))

    if stone.hp <= 0:
        mined = True
        reward_name = stone.name
        player.inventory[stone.id] += 1
        player.mined_stats[stone.id] += 1

        # Опыт за уничтожение руды
        xp_reward = ROCKS_CONFIG[stone.id]['price'] * 2
        if player.add_xp(xp_reward):
            leveled_up = True

        # Случайный шанс мини-игры (2% при уничтожении руды)
        if random.random() < 0.02:
            minigame_trigger = random.choice(['runner', 'tunnels'])

        player.current_stone = generate_next_stone(player.level, player.luck)

    return jsonify({
        'success': True,
        'mined': mined,
        'is_crit': is_crit,
        'damage_dealt': damage,
        'reward_name': reward_name,
        'leveled_up': leveled_up,
        'minigame': minigame_trigger,
        'player': player.to_dict()
    })


@app.route('/api/auto_mine', methods=['POST'])
def auto_mine():
    player = get_current_player()
    if player.auto_level <= 0:
        return jsonify({'success': False, 'message': 'Авто-майнинг не куплен'})

    if player.get_total_inventory_count() >= player.get_max_bag_capacity():
        return jsonify({'success': False, 'message': '🎒 Рюкзак полон!', 'player': player.to_dict()})

    stone = player.current_stone
    # Авто-урон зависит от уровня бура
    damage = player.auto_level
    stone.hp -= damage

    mined = False
    reward_name = ""
    leveled_up = player.add_xp(1)
    minigame_trigger = None

    if stone.hp <= 0:
        mined = True
        reward_name = stone.name
        player.inventory[stone.id] += 1
        player.mined_stats[stone.id] += 1

        if player.add_xp(ROCKS_CONFIG[stone.id]['price']):
            leveled_up = True

        if random.random() < 0.01:  # 1% шанс при авто-майнинге
            minigame_trigger = random.choice(['runner', 'tunnels'])

        player.current_stone = generate_next_stone(player.level, player.luck)

    return jsonify({
        'success': True,
        'mined': mined,
        'reward_name': reward_name,
        'leveled_up': leveled_up,
        'minigame': minigame_trigger,
        'player': player.to_dict()
    })


@app.route('/api/minigame_reward', methods=['POST'])
def minigame_reward():
    player = get_current_player()
    data = request.get_json() or {}
    success = data.get('success', False)
    game_type = data.get('type', 'runner')

    if success:
        # Награда зависит от уровня игрока
        gold_reward = player.level * random.randint(50, 150)
        xp_reward = player.level * 30
        player.coins += gold_reward
        leveled_up = player.add_xp(xp_reward)
        return jsonify({
            'success': True,
            'message': f'🏆 Победа! Награда: {gold_reward} 🪙 и {xp_reward} XP!',
            'leveled_up': leveled_up,
            'player': player.to_dict()
        })

    return jsonify({'success': False, 'message': '💨 В следующий раз повезет!', 'player': player.to_dict()})


@app.route('/api/sell', methods=['POST'])
def sell():
    player = get_current_player()
    earned = 0

    for rock_id, count in player.inventory.items():
        if count > 0:
            price = ROCKS_CONFIG[rock_id]['price']
            earned += count * price
            player.inventory[rock_id] = 0

    player.coins += earned
    return jsonify({
        'success': True,
        'earned': earned,
        'player': player.to_dict()
    })


@app.route('/api/buy_upgrade', methods=['POST'])
def buy_upgrade():
    player = get_current_player()
    data = request.get_json() or {}
    upgrade_type = data.get('type')

    # Проверка уровней разблокировки апгрейдов в магазине
    requirements = {'power': 1, 'luck': 3, 'bag': 2, 'auto': 4}
    if upgrade_type in requirements and player.level < requirements[upgrade_type]:
        return jsonify({'success': False, 'message': f'🔒 Требуется {requirements[upgrade_type]} уровень!'})

    cost = player.get_upgrade_cost(upgrade_type)

    if player.coins >= cost:
        player.coins -= cost
        if upgrade_type == 'power':
            player.power += 1
        elif upgrade_type == 'luck':
            player.luck += 1
        elif upgrade_type == 'bag':
            player.bag_level += 1
        elif upgrade_type == 'auto':
            player.auto_level += 1

        return jsonify({'success': True, 'message': '✅ Успешно улучшено!', 'player': player.to_dict()})

    return jsonify({'success': False, 'message': '❌ Недостаточно монет!'})