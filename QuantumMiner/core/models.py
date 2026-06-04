"""
Модели данных на Pydantic v2.
"""

from __future__ import annotations
from typing import TypeAlias
from pydantic import BaseModel, Field

RockId: TypeAlias = str

class RockConfig(BaseModel):
    name: str
    hp: int
    price: int
    base_chance: float
    min_level: int
    color: str

ROCKS: dict[RockId, RockConfig] = {
    "stone":       RockConfig(name="Камень",       hp=5,    price=1,    base_chance=40.0, min_level=1,  color="#94a3b8"),
    "coal":        RockConfig(name="Уголь",         hp=8,    price=3,    base_chance=20.0, min_level=1,  color="#334155"),
    "amber":       RockConfig(name="Янтарь",        hp=12,   price=5,    base_chance=12.0, min_level=2,  color="#f59e0b"),
    "lapis":       RockConfig(name="Лазурит",       hp=15,   price=8,    base_chance=8.0,  min_level=2,  color="#3b82f6"),
    "copper":      RockConfig(name="Медь",          hp=25,   price=16,   base_chance=4.5,  min_level=3,  color="#b45309"),
    "iron":        RockConfig(name="Железо",        hp=35,   price=22,   base_chance=3.2,  min_level=3,  color="#cbd5e1"),
    "topaz":       RockConfig(name="Топаз",         hp=70,   price=45,   base_chance=1.5,  min_level=4,  color="#f43f5e"),
    "amethyst":    RockConfig(name="Аметист",       hp=100,  price=65,   base_chance=1.0,  min_level=4,  color="#a855f7"),
    "opal":        RockConfig(name="Опал",          hp=140,  price=90,   base_chance=0.7,  min_level=5,  color="#2dd4bf"),
    "silver":      RockConfig(name="Серебро",       hp=200,  price=130,  base_chance=0.5,  min_level=5,  color="#e2e8f0"),
    "gold":        RockConfig(name="Золото",        hp=300,  price=200,  base_chance=0.3,  min_level=6,  color="#eab308"),
    "platinum":    RockConfig(name="Платина",       hp=450,  price=320,  base_chance=0.15, min_level=6,  color="#94a3b8"),
    "aquamarine":  RockConfig(name="Аквамарин",     hp=600,  price=500,  base_chance=0.08, min_level=7,  color="#06b6d4"),
    "sapphire":    RockConfig(name="Сапфир",        hp=800,  price=800,  base_chance=0.04, min_level=7,  color="#2563eb"),
    "emerald":     RockConfig(name="Изумруд",       hp=1100, price=1300, base_chance=0.02, min_level=8,  color="#10b981"),
    "ruby":        RockConfig(name="Рубин",         hp=1500, price=2000, base_chance=0.01, min_level=8,  color="#ef4444"),
    "alexandrite": RockConfig(name="Александрит",   hp=2200, price=3500, base_chance=0.004,min_level=9,  color="#ec4899"),
    "diamond":     RockConfig(name="Алмаз",         hp=3000, price=5000, base_chance=0.001,min_level=10, color="#38bdf8"),
}

class Stone(BaseModel):
    id: RockId
    name: str
    hp: int
    max_hp: int
    price: int
    color: str

    @classmethod
    def from_id(cls, rock_id: RockId) -> "Stone":
        cfg = ROCKS.get(rock_id, ROCKS["stone"])
        return cls(id=rock_id, name=cfg.name, hp=cfg.hp, max_hp=cfg.hp, price=cfg.price, color=cfg.color)

class Achievements(BaseModel):
    first_mine: bool = False
    level_5: bool = False
    level_10: bool = False
    diamond_miner: bool = False
    lucky_one: bool = False
    master_miner: bool = False
    bag_master: bool = False
    auto_legend: bool = False
    prestige_1: bool = False
    rich: bool = False

    @property
    def unlocked_count(self) -> int:
        return sum(1 for v in self.model_dump().values() if v is True)

    def check_and_update(self, player: "Player") -> bool:
        changed = False
        total_mined = sum(player.mined_stats.values())
        checks: list[tuple[str, bool]] = [
            ("first_mine",    total_mined > 0),
            ("level_5",       player.level >= 5),
            ("level_10",      player.level >= 10),
            ("diamond_miner", player.mined_stats.get("diamond", 0) >= 1),
            ("lucky_one",     player.luck >= 5),
            ("master_miner",  total_mined >= 500),
            ("bag_master",    player.bag_level >= 5),
            ("auto_legend",   player.auto_level >= 8),
            ("prestige_1",    player.prestige >= 1),
            ("rich",          player.coins >= 100000),
        ]
        for field_name, condition in checks:
            if not getattr(self, field_name) and condition:
                setattr(self, field_name, True)
                changed = True
        return changed

class Player(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    coins: int = 0
    level: int = 1
    xp: int = 0
    power: int = 1
    luck: int = 0
    bag_level: int = 1
    auto_level: int = 0

    # Новые апгрейды
    explosive_level: int = 0      # Взрывчатка
    scanner_level: int = 0        # Сканер руд
    smelter_level: int = 0        # Плавильня (авто-продажа дешёвых)
    magnet_level: int = 0         # Магнит (шанс двойной добычи)

    # Счётчик для взрывчатки
    click_counter: int = 0

    # Престиж
    prestige: int = 0
    prestige_bonus: float = 1.0   # множитель удачи/дохода

    # Рынок: текущие множители цен (обновляются каждые 5 мин)
    market_multipliers: dict[RockId, float] = Field(
        default_factory=lambda: {k: 1.0 for k in ROCKS}
    )

    mined_stats: dict[RockId, int] = Field(default_factory=lambda: {k: 0 for k in ROCKS})
    inventory: dict[RockId, int] = Field(default_factory=lambda: {k: 0 for k in ROCKS})
    current_stone: Stone = Field(default_factory=lambda: Stone.from_id("stone"))
    next_stone_id: str | None = None   # Сканер руд — подсказка
    achievements: Achievements = Field(default_factory=Achievements)

    @property
    def max_xp(self) -> int:
        return self.level * 100

    @property
    def max_bag(self) -> int:
        return self.bag_level * 20

    @property
    def bag_count(self) -> int:
        return sum(self.inventory.values())

    def add_xp(self, amount: int) -> bool:
        self.xp += amount
        leveled_up = False
        while self.xp >= self.max_xp:
            self.xp -= self.max_xp
            self.level += 1
            leveled_up = True
        return leveled_up

    def upgrade_cost(self, upgrade_type: str) -> int:
        match upgrade_type:
            case "power":     return int(100  * (self.power ** 1.8))
            case "luck":      return int(250  * ((self.luck + 1) ** 2))
            case "bag":       return int(150  * (self.bag_level ** 1.5))
            case "auto":      return int(300  * ((self.auto_level + 1) ** 1.9))
            case "explosive": return int(500  * ((self.explosive_level + 1) ** 2))
            case "scanner":   return int(800  * ((self.scanner_level + 1) ** 1.7))
            case "smelter":   return int(600  * ((self.smelter_level + 1) ** 1.8))
            case "magnet":    return int(1000 * ((self.magnet_level + 1) ** 2))
            case _:           return 0

    def prestige_cost(self) -> int:
        return (self.prestige + 1) * 50000

    def to_dict(self) -> dict:
        return {
            "coins": self.coins,
            "level": self.level,
            "xp": self.xp,
            "max_xp": self.max_xp,
            "power": self.power,
            "luck": self.luck,
            "bag_level": self.bag_level,
            "max_bag": self.max_bag,
            "bag_count": self.bag_count,
            "auto_level": self.auto_level,
            "explosive_level": self.explosive_level,
            "scanner_level": self.scanner_level,
            "smelter_level": self.smelter_level,
            "magnet_level": self.magnet_level,
            "click_counter": self.click_counter,
            "prestige": self.prestige,
            "prestige_bonus": self.prestige_bonus,
            "prestige_cost": self.prestige_cost(),
            "market_multipliers": self.market_multipliers,
            "next_stone_id": self.next_stone_id,
            "inventory": self.inventory,
            "mined_stats": self.mined_stats,
            "current_stone": self.current_stone.model_dump(),
            "achievements": self.achievements.model_dump(),
            "achievements_unlocked": self.achievements.unlocked_count,
        }

# Схемы запросов
class UpgradeRequest(BaseModel):
    type: str

class MinigameResultRequest(BaseModel):
    type: str
    success: bool
