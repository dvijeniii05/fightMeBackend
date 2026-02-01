# StrikeForge Abyss - Game Mechanics Documentation

## Table of Contents

1. [Hero Stats System](#hero-stats-system)
2. [Leveling System](#leveling-system)
3. [Currency System](#currency-system)
4. [Forging & Enhancement](#forging--enhancement)
5. [Dungeons](#dungeons)

---

## Hero Stats System

### Base Stats

Every hero has 5 core stats that can be allocated:

| Stat          | Description                            | Starting Value |
| ------------- | -------------------------------------- | -------------- |
| **Strength**  | Affects damage output and combat areas | 5              |
| **Mastery**   | Affects critical hits                  | 5              |
| **Agility**   | Affects evasion and speed              | 5              |
| **Knowledge** | TBC                                    | 5              |
| **Health**    | Affects HP and defense                 | 5              |

### Calculated Stats (Formulas)

Each base stat influences calculated stats through specific multipliers:

#### Strength

- **Base Damage**: `strength × 1.5`
- **Block Area**: `strength × 1.5`
- **Attack Area**: `strength × 1.5`

#### Mastery

- **Crit Multiplier**: `mastery × 0.02`
- **Crit Chance**: `mastery × 0.30(%)`

#### Agility

- **Evade Chance**: `agility × 0.30(%)`
- **Fast Chance**: `agility × 0.20(%)`

#### Knowledge

- **TBC**

#### Health

- **HP Points**: `health × 100`
- **Block Area**: `health × 1.5`

### Stat Limits

All calculated stats have maximum limits split between stats allocation and gear
contribution:

| Calculated Stat     | Total Max | From Stats | From Gear |
| ------------------- | --------- | ---------- | --------- |
| **Base Damage**     | 450       | 150        | 300       |
| **Block Area**      | TBC       | TBC        | TBC       |
| **Attack Area**     | TBC       | TBC        | TBC       |
| **Crit Multiplier** | 5.0×      | 2.0×       | 3.0×      |
| **Crit Chance**     | 70%       | 30%        | 40%       |
| **Evade Chance**    | 70%       | 30%        | 40%       |
| **Fast Chance**     | 50%       | 20%        | 30%       |
| **HP**              | 20,000    | 10,000     | 10,000    |

---

## Leveling System

### Level Progression

- **Starting Level**: 1
- **Maximum Level**: 25
- **Starting Stats**: 5 points in each stat (25 total)
- **Total Available Points**: 255

### Stat Allocation Rules

- Upon progression, hero can have **only 1 stat maxed out** to **100 points**
- Remaining points (155) must be distributed among other stats

### Experience Requirements

Heroes require progressively more experience to level up:

| Level Up | Experience Required | Formula                                           |
| -------- | ------------------- | ------------------------------------------------- |
| 1 → 2    | 100                 | Base                                              |
| 2 → 3    | 125                 | Previous × 1.25                                   |
| 3 → 4    | 156                 | Previous × 1.25                                   |
| n → n+1  | Previous × 1.25     | Each level requires **125%** of previous level XP |

**Formula**: `XP(n) = 100 × (1.25)^(n-1)`

---

## Currency System

### Souls 💀

**Primary trading currency**

#### Usage

- Buy gear from marketplace
- Main trading currency between players (future feature)

#### How to Obtain

- **PvE Fights**: Primary source
  - Soul reward scales with level difference
  - Larger level gap = More souls on victory
  - Fighting higher-level NPCs yields better rewards

---

### Shards 💎

**Enhancement/Forging currency**

#### Usage

- Forge and enhance gear
- Required for all enhancement levels (0 → +9)

#### Types

There are **3 types** of shards, each used for specific enhancement ranges:

| Shard Type | Enhancement Range | Usage                     |
| ---------- | ----------------- | ------------------------- |
| **Type 1** | +0 → +3           | Basic enhancements        |
| **Type 2** | +3 → +6           | Intermediate enhancements |
| **Type 3** | +6 → +9           | Advanced enhancements     |

#### How to Obtain

- **Dungeons** (Primary source):
  - PvE fights: 3-7 shards per fight (random)
  - Dungeon completion rewards
- **PvE Fights**: TBC (may be added as secondary source)

---

## Forging & Enhancement

### Overview

Enhancement system that improves gear through **9 levels** (0 → +9) using
shards.

### Shard Requirements

| Current Level | Target Level | Shards Required | Shard Type |
| ------------- | ------------ | --------------- | ---------- |
| +0            | +1           | 20              | Type 1     |
| +1            | +2           | 40              | Type 1     |
| +2            | +3           | 60              | Type 1     |
| +3            | +4           | 20              | Type 2     |
| +4            | +5           | 40              | Type 2     |
| +5            | +6           | 60              | Type 2     |
| +6            | +7           | 20              | Type 3     |
| +7            | +8           | 40              | Type 3     |
| +8            | +9           | 60              | Type 3     |

### Success Rates

Forging is **not guaranteed** and decreases with enhancement level:

| Enhancement Range | Success Rate |
| ----------------- | ------------ |
| +0 → +3           | 90%          |
| +3 → +6           | 60%          |
| +6 → +9           | ~30%         |

> ⚠️ **Note**: Failed enhancement attempts consume shards but do not downgrade
> the item.

### Enhancement Effects

#### Levels +0 → +6: Primary Stat Boost

- Each enhancement level adds **+10% of the original base stat**
  - Weapons: Base Damage
  - Armor: Defense (TBC)
  - Accessories: Main stat (TBC)

**Example (Weapon with 100 base damage)**:

- **+0**: 100 damage (original)
- **+1**: 110 damage (100 + 10%)
- **+2**: 120 damage (100 + 20%)
- **+3**: 130 damage (100 + 30%)
- **+4**: 140 damage (100 + 40%)
- **+5**: 150 damage (100 + 50%)
- **+6**: 160 damage (100 + 60%)

> 📝 Final damage values are pre-calculated and stored in DB for each
> enhancement level

#### Levels +7 → +8: Secondary Stat Boost

- **Does NOT boost** primary stat
- Boosts the **secondary stat** by **TBC%** of its original value
  - Weapons: Crit Multiplier
  - Armor: Secondary defense stat (TBC)
  - Accessories: Secondary stat (TBC)

#### Level +9: Awakening System 🌟

**⚠️ POST-RELEASE FEATURE**

- Grants **+40% of the original base stat** (total +100% from base at +9)
  - Example: Weapon with 100 base damage → **200 damage** at +9
- Choose **1 of 2** unique stat options
- Grants a completely new/unique stat based on choice
- **Changes item icon/image** based on choice
- **Rollout Plan**:
  1. ✅ Weapons first
  2. Later: Armor + Accessories

---

## Dungeons

### Overview

Challenging PvE content that rewards enhancement shards.

### Difficulty Levels

- **Total Levels**: 3
- **Available at Release**: 1-2 levels (TBC)
- **Future**: Full 3 levels

### Rewards

#### PvE Fight Drops

- **Shards**: 3-7 per fight (random)
- Type of shards depends on dungeon level (TBC)

#### Completion Rewards

- TBC

### Notes

- Primary source of **Type 2** and **Type 3** shards
- Difficulty scales with dungeon level
- More details TBD

---

## Quick Reference

### Max Stat Points Distribution Example

- **1 stat**: 100 points (maxed)
- **Remaining 4 stats**: 155 points total
- **Starting total**: 25 points
- **Gained from leveling**: 230 points (level 2-25)

### Shard Totals Needed

| Enhancement Path | Total Shards  | Shard Types |
| ---------------- | ------------- | ----------- |
| +0 → +3          | 120           | Type 1      |
| +3 → +6          | 120           | Type 2      |
| +6 → +9          | 120           | Type 3      |
| **Full +9**      | **360 total** | All 3 types |

### Enhancement Cost Analysis

- At 90% success rate (+0→+3): ~133 shards expected
- At 60% success rate (+3→+6): ~200 shards expected
- At 30% success rate (+6→+9): ~400 shards expected

---

_Last Updated: January 2026_
