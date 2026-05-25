import random
from app.models import Stone, Player


class Game:
    ROCKS_CONFIG = {
        'stone': {'name': 'Камень', 'chance': 50, 'hp': 5, 'price': 1},
        'coal': {'name': 'Уголь', 'chance': 25, 'hp': 7, 'price': 3},
        'iron': {'name': 'Железо', 'chance': 12, 'hp': 10, 'price': 6},
        'sapphire': {'name': 'Сапфир', 'chance': 7, 'hp': 15, 'price': 12},
        'ruby': {'name': 'Рубин', 'chance': 4, 'hp': 25, 'price': 25},
        'amethyst': {'name': 'Аметист', 'chance': 1.5, 'hp': 30, 'price': 40},
        'diamond': {'name': 'Алмаз', 'chance': 0.5, 'hp': 40, 'price': 100}
    }

    PICKAXES_CONFIG = {
        'wooden': {'name': '🪓 Деревянная кирка', 'power': 1.0, 'price': 0},
        'enhanced': {'name': '🔨 Улучшенная кирка', 'power': 1.5, 'price': 150},
        'fast': {'name': '⚡ Быстрая кирка', 'power': 2.0, 'price': 500},
        'laser': {'name': '🚀 Лазерный бур', 'power': 5.0, 'price': 2000}
    }

    INVENTORY_UPGRADES = {
        'bag_lvl2': {'name': '🎒 Кожаный мешок', 'description': 'Увеличивает рюкзак до 40 слотов', 'cost': 100,
                     'slots': 40},
        'bag_lvl3': {'name': '💼 Железный сундук', 'description': 'Увеличивает рюкзак до 100 слотов', 'cost': 600,
                     'slots': 100},
    }

    def generate_random_stone(self):
        choices = list(self.ROCKS_CONFIG.keys())
        weights = [rock['chance'] for rock in self.ROCKS_CONFIG.values()]
        selected = random.choices(choices, weights=weights)[0]
        cfg = self.ROCKS_CONFIG[selected]
        return Stone(id=selected, name=cfg['name'], chance=cfg['chance'], hp=cfg['hp'], price=cfg['price'])

    def mine_stone(self, player: Player):
        pickaxe_cfg = self.PICKAXES_CONFIG.get(player.current_pickaxe_id)
        damage = pickaxe_cfg['power'] if pickaxe_cfg else 1.0

        is_destroyed = player.current_stone.take_damage(damage)
        mined_successfully = False
        reward_name = ""

        if is_destroyed:
            stone_id = player.current_stone.id
            reward_name = player.current_stone.name

            if player.inventory.add_item(stone_id):
                mined_successfully = True

            player.current_stone = self.generate_random_stone()

        return mined_successfully, reward_name

    def sell_all_inventory(self, player: Player):
        total_earned = 0
        for stone_id, count in player.inventory.items.items():
            price = self.ROCKS_CONFIG[stone_id]['price']
            total_earned += count * price

        player.inventory.clear()
        player.coins += total_earned
        return total_earned

    def buy_pickaxe(self, player: Player, pickaxe_id: str):
        if pickaxe_id not in self.PICKAXES_CONFIG:
            return False, "Такой кирки не существует"

        if pickaxe_id in player.owned_pickaxes:
            player.current_pickaxe_id = pickaxe_id
            return True, "Кирка успешно экипирована"

        cost = self.PICKAXES_CONFIG[pickaxe_id]['price']
        if player.coins >= cost:
            player.coins -= cost
            player.owned_pickaxes.append(pickaxe_id)
            player.current_pickaxe_id = pickaxe_id
            return True, "Кирка куплена и экипирована!"

        return False, "Недостаточно монет!"

    def buy_inventory_upgrade(self, player: Player, upgrade_id: str):
        if upgrade_id not in self.INVENTORY_UPGRADES:
            return False, "Такого улучшения не существует"

        cfg = self.INVENTORY_UPGRADES[upgrade_id]
        if player.inventory.slots_limit >= cfg['slots']:
            return False, "У вас уже есть это улучшение"

        if player.coins >= cfg['cost']:
            player.coins -= cfg['cost']
            player.inventory.slots_limit = cfg['slots']
            return True, f"Рюкзак улучшен до {cfg['slots']} слотов!"

        return False, "Недостаточно монет!"