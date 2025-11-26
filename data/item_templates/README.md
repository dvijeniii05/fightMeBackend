# Item Templates Collection

This folder contains predefined item template bodies that can be used with the
`/misc/createItem` endpoint.

## Usage

Each JSON file contains a complete request body that can be sent to:

```
POST /misc/createItem
Content-Type: application/json
```

## File Organization

- `weapons/` - Weapon item templates (swords, bows, etc.)
- `armor/` - Armor item templates (helmets, chest, etc.)
- `accessories/` - Accessory item templates (rings, amulets, etc.)
- `consumables/` - Consumable item templates (potions, scrolls, etc.)

## Level Categories

- **Early Game** (Level 1-10) - Starter items
- **Mid Game** (Level 11-30) - Intermediate items
- **Late Game** (Level 31-51) - End-game items

## Rarity Guidelines

Based on `HERO_STATS_RULES.md`:

- **Common**: 20-40% of max gear potential
- **Rare**: 40-60% of max gear potential
- **Epic**: 60-80% of max gear potential
- **Legendary**: 80-100% of max gear potential
