import random
from app.models import ROCKS_CONFIG, Stone

def generate_next_stone(player_level, luck_level):
    rock_ids = []
    weights = []

    for rock_id, config in ROCKS_CONFIG.items():
        # Доступно только если уровень игрока удовлетворяет требованиям руды
        if player_level >= config['min_level']:
            rock_ids.append(rock_id)
            base = config['base_chance']

            if rock_id == 'stone':
                mod_chance = max(5.0, base - (luck_level * 2.5))
            else:
                mod_chance = base * (1 + 0.25 * luck_level)

            weights.append(mod_chance)

    if not rock_ids:
        return Stone('stone')

    chosen_id = random.choices(rock_ids, weights=weights, k=1)[0]
    return Stone(chosen_id)