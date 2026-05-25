import random


class Pickaxe:
    def __init__(self, pickaxe_id, name, power, price, level=1):
        self.id = pickaxe_id
        self.name = name
        self.power = power
        self.price = price
        self.level = level

    def to_dict(self):
        return self.__dict__

    @classmethod
    def from_dict(cls, data):
        if not data: return None
        return cls(**data)


class Inventory:
    def __init__(self, slots_limit=20, items=None):
        self.slots_limit = slots_limit
        self.items = items if items is not None else {}

    def get_total_items_count(self):
        return sum(self.items.values())

    def is_full(self):
        return self.get_total_items_count() >= self.slots_limit

    def add_item(self, rock_id):
        if self.is_full():
            return False
        self.items[rock_id] = self.items.get(rock_id, 0) + 1
        return True

    def clear(self):
        self.items = {}

    def to_dict(self):
        return self.__dict__

    @classmethod
    def from_dict(cls, data):
        if not data: return cls()
        return cls(slots_limit=data.get('slots_limit', 20), items=data.get('items', {}))


class Stone:
    # Имя аргумента изменено на id, чтобы избежать конфликтов при десериализации JSON
    def __init__(self, id, name, chance, hp, price, max_hp=None):
        self.id = id
        self.name = name
        self.chance = chance
        self.hp = hp
        self.max_hp = max_hp if max_hp is not None else hp
        self.price = price

    def take_damage(self, damage):
        self.hp = round(self.hp - damage, 2)
        return self.hp <= 0

    def to_dict(self):
        return self.__dict__

    @classmethod
    def from_dict(cls, data):
        if not data: return None
        return cls(**data)


class Player:
    def __init__(self, coins=0, current_pickaxe_id='wooden', owned_pickaxes=None, inventory=None, current_stone=None):
        self.coins = coins
        self.current_pickaxe_id = current_pickaxe_id
        self.owned_pickaxes = owned_pickaxes if owned_pickaxes else ['wooden']
        self.inventory = inventory if inventory else Inventory()
        self.current_stone = current_stone

    def to_dict(self):
        return {
            'coins': self.coins,
            'current_pickaxe_id': self.current_pickaxe_id,
            'owned_pickaxes': self.owned_pickaxes,
            'inventory': self.inventory.to_dict(),
            'current_stone': self.current_stone.to_dict() if self.current_stone else None
        }

    @classmethod
    def from_dict(cls, data, game_instance):
        if not data:
            player = cls()
            player.current_stone = game_instance.generate_random_stone()
            return player

        stone_data = data.get('current_stone')
        current_stone = Stone.from_dict(stone_data) if stone_data else game_instance.generate_random_stone()

        return cls(
            coins=data.get('coins', 0),
            current_pickaxe_id=data.get('current_pickaxe_id', 'wooden'),
            owned_pickaxes=data.get('owned_pickaxes', ['wooden']),
            inventory=Inventory.from_dict(data.get('inventory')),
            current_stone=current_stone
        )