import random

# Полная база данных руд с привязкой к уровням разблокировки
ROCKS_CONFIG = {
    'stone': {'name': 'Камень', 'hp': 5, 'price': 1, 'base_chance': 40.0, 'min_level': 1, 'color': '#94a3b8'},
    'coal': {'name': 'Уголь', 'hp': 8, 'price': 3, 'base_chance': 20.0, 'min_level': 1, 'color': '#334155'},
    'amber': {'name': 'Янтарь', 'hp': 12, 'price': 5, 'base_chance': 12.0, 'min_level': 2, 'color': '#f59e0b'},
    'lapis': {'name': 'Лазурит', 'hp': 15, 'price': 8, 'base_chance': 8.0, 'min_level': 2, 'color': '#3b82f6'},
    'copper': {'name': 'Медь', 'hp': 25, 'price': 16, 'base_chance': 4.5, 'min_level': 3, 'color': '#b45309'},
    'iron': {'name': 'Железо', 'hp': 35, 'price': 22, 'base_chance': 3.2, 'min_level': 3, 'color': '#cbd5e1'},
    'topaz': {'name': 'Топаз', 'hp': 70, 'price': 45, 'base_chance': 1.5, 'min_level': 4, 'color': '#f43f5e'},
    'amethyst': {'name': 'Аметист', 'hp': 100, 'price': 65, 'base_chance': 1.0, 'min_level': 4, 'color': '#a855f7'},
    'opal': {'name': 'Опал', 'hp': 140, 'price': 90, 'base_chance': 0.7, 'min_level': 5, 'color': '#2dd4bf'},
    'silver': {'name': 'Серебро', 'hp': 200, 'price': 130, 'base_chance': 0.5, 'min_level': 5, 'color': '#e2e8f0'},
    'gold': {'name': 'Золото', 'hp': 300, 'price': 200, 'base_chance': 0.3, 'min_level': 6, 'color': '#eab308'},
    'platinum': {'name': 'Платина', 'hp': 450, 'price': 320, 'base_chance': 0.15, 'min_level': 6, 'color': '#94a3b8'},
    'aquamarine': {'name': 'Аквамарин', 'hp': 600, 'price': 500, 'base_chance': 0.08, 'min_level': 7,
                   'color': '#06b6d4'},
    'sapphire': {'name': 'Сапфир', 'hp': 800, 'price': 800, 'base_chance': 0.04, 'min_level': 7, 'color': '#2563eb'},
    'emerald': {'name': 'Изумруд', 'hp': 1100, 'price': 1300, 'base_chance': 0.02, 'min_level': 8, 'color': '#10b981'},
    'ruby': {'name': 'Рубин', 'hp': 1500, 'price': 2000, 'base_chance': 0.01, 'min_level': 8, 'color': '#ef4444'},
    'alexandrite': {'name': 'Александрит', 'hp': 2200, 'price': 3500, 'base_chance': 0.004, 'min_level': 9,
                    'color': '#ec4899'},
    'diamond': {'name': 'Алмаз', 'hp': 3000, 'price': 5000, 'base_chance': 0.001, 'min_level': 10, 'color': '#38bdf8'}
}


class Stone:
    def __init__(self, rock_id):
        config = ROCKS_CONFIG.get(rock_id, ROCKS_CONFIG['stone'])
        self.id = rock_id
        self.name = config['name']
        self.max_hp = config['hp']
        self.hp = config['hp']
        self.price = config['price']
        self.color = config['color']

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'hp': self.hp,
            'max_hp': self.max_hp,
            'price': self.price,
            'color': self.color
        }


class Player:
    def __init__(self):
        self.coins = 0
        self.level = 1
        self.xp = 0
        self.power = 1  # Сила клика (Заточка кирки)
        self.luck = 0  # Квантовая удача (Ур. 0+)
        self.bag_level = 1  # Вместимость рюкзака
        self.auto_level = 0  # Авто-майнинг (Ур. 0+)

        # Статистика добычи для коллекции
        self.mined_stats = {rock_id: 0 for rock_id in ROCKS_CONFIG}
        self.inventory = {rock_id: 0 for rock_id in ROCKS_CONFIG}
        self.current_stone = Stone('stone')

    def get_max_xp(self):
        return self.level * 100

    def get_max_bag_capacity(self):
        return self.bag_level * 20

    def get_total_inventory_count(self):
        return sum(self.inventory.values())

    def add_xp(self, amount):
        self.xp += amount
        leveled_up = False
        while self.xp >= self.get_max_xp():
            self.xp -= self.get_max_xp()
            self.level += 1
            leveled_up = True
        return leveled_up

    def get_upgrade_cost(self, upgrade_type):
        if upgrade_type == 'power':
            return int(100 * (self.power ** 1.8))
        elif upgrade_type == 'luck':
            return int(250 * ((self.luck + 1) ** 2))
        elif upgrade_type == 'bag':
            return int(150 * (self.bag_level ** 1.5))
        elif upgrade_type == 'auto':
            return int(300 * ((self.auto_level + 1) ** 1.9))
        return 0

    def to_dict(self):
        return {
            'coins': self.coins,
            'level': self.level,
            'xp': self.xp,
            'max_xp': self.get_max_xp(),
            'power': self.power,
            'luck': self.luck,
            'bag_level': self.bag_level,
            'max_bag': self.get_max_bag_capacity(),
            'bag_count': self.get_total_inventory_count(),
            'auto_level': self.auto_level,
            'inventory': self.inventory,
            'mined_stats': self.mined_stats,
            'current_stone': self.current_stone.to_dict()
        }