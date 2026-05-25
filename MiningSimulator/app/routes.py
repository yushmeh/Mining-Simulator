from flask import Blueprint, render_template, session, jsonify, request
from app.game_logic import Game
from app.models import Player

bp = Blueprint('main', __name__)
game = Game()


@bp.route('/')
def index():
    player_data = session.get('player')
    player = Player.from_dict(player_data, game)
    session['player'] = player.to_dict()

    return render_template('index.html',
                           player=player,
                           rocks_config=game.ROCKS_CONFIG,
                           pickaxes_config=game.PICKAXES_CONFIG,
                           bag_upgrades=game.INVENTORY_UPGRADES)


@bp.route('/api/click', methods=['POST'])
def click():
    player = Player.from_dict(session.get('player'), game)

    if player.inventory.is_full():
        return jsonify({
            'error': True,
            'message': '🎒 Ваш рюкзак заполнен! Сходите в магазин и продайте ресурсы.',
            'current_rock': player.current_stone.to_dict()
        })

    mined, reward_name = game.mine_stone(player)

    session['player'] = player.to_dict()
    session.modified = True

    return jsonify({
        'mined': mined,
        'reward_name': reward_name,
        'current_rock': player.current_stone.to_dict(),
        'inventory': player.inventory.items,
        'total_items': player.inventory.get_total_items_count(),
        'slots_limit': player.inventory.slots_limit
    })


@bp.route('/api/sell', methods=['POST'])
def sell():
    player = Player.from_dict(session.get('player'), game)
    earned = game.sell_all_inventory(player)

    session['player'] = player.to_dict()
    session.modified = True

    return jsonify({
        'success': True,
        'coins': player.coins,
        'inventory': player.inventory.items,
        'total_items': player.inventory.get_total_items_count(),
        'earned': earned
    })


@bp.route('/api/buy_upgrade', methods=['POST'])
def buy_upgrade():
    player = Player.from_dict(session.get('player'), game)
    data = request.get_json() or {}

    upgrade_id = data.get('upgrade_id')
    upgrade_type = data.get('type')

    success = False
    message = ""

    if upgrade_type == 'pickaxe':
        success, message = game.buy_pickaxe(player, upgrade_id)
    elif upgrade_type == 'inventory':
        success, message = game.buy_inventory_upgrade(player, upgrade_id)

    if success:
        session['player'] = player.to_dict()
        session.modified = True

    return jsonify({'success': success, 'message': message})