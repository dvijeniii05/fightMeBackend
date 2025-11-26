# Hero Stats & Calculation Rules

## 🎯 Core Hero Statistics System

### **Base Hero Stats**

Every hero has **5 primary stats**:

- **Strength** - Affects damage output
- **Mastery** - Affects critical hits and fast attacks
- **Agility** - Affects evasion
- **Knowledge** - Reserved for future magic system
- **Health** - Affects total HP pool

### **Leveling System**

- **Starting Level**: 0
- **Max Level**: 51
- **Starting Stats**: 5 points in each stat
- **Points per Level**: 5 stat points to allocate
- **Stat Limits**: Only **1 stat** can be maxed to 100 points
- **Total Available Points**: 255 points (51 levels × 5 points)

## 📊 Stat Calculation Formulas

### **1. Base Damage Boost (Strength)**

```
Formula: baseDamageBoost = 1.5 × Strength
Max Total: 450
├── From Stats: 150 (100 Strength × 1.5)
└── From Gear: 300
```

### **2. Critical Multiplier (Mastery)**

```
Formula: critMultiplier = 1.5 + (0.02 × Mastery)
Max Total: 6.5
├── From Stats: 3.5 (1.5 base + 100 Mastery × 0.02)
└── From Gear: +3.0
```

### **3. Critical Chance (Mastery)**

```
Formula: critChance = 0.3% × Mastery
Max Total: 70%
├── From Stats: 30% (100 Mastery × 0.3%)
└── From Gear: 40%
```

### **4. Evasion Chance (Agility)**

```
Formula: evadeChance = 0.3% × Agility
Max Total: 70%
├── From Stats: 30% (100 Agility × 0.3%)
└── From Gear: 40%
```

### **5. Fast Attack Chance (Agility)**

```
Formula: fastChance = 0.2% × Agility
Max Total: 50%
├── From Stats: 20% (100 Agility × 0.2%)
└── From Gear: 30%
```

### **6. Health Points (Health)**

```
Formula: hp = 100 × Health
Max Total: 20,000 HP
├── From Stats: 10,000 (100 Health × 100)
└── From Gear: 10,000
```

## 🛡️ Gear Integration Rules

### **Item Template Stats Guidelines**

When creating items in `itemTemplateSxma`, use these guidelines for `baseStats`:

#### **Weapon Stats (Primary damage dealers)**

```json
{
  "baseDamageBoost": 30-100,    // Major damage contribution
  "critChance": 5-15,           // 5-15% crit chance
  "critMultiplier": 0.3-1.0     // 0.3-1.0 additional multiplier
}
```

#### **Armor Stats (Defensive/utility)**

```json
{
  "health": 500-2000,           // 500-2000 additional HP
  "evadeChance": 5-15,          // 5-15% evasion
  "fastChance": 3-10            // 3-10% fast attack
}
```

#### **Accessory Stats (Balanced bonuses)**

```json
{
  "baseDamageBoost": 10-50,
  "health": 200-800,
  "critChance": 2-8,
  "evadeChance": 2-8
}
```

### **Rarity-Based Stat Ranges**

- **Common**: 20-40% of max gear potential
- **Rare**: 40-60% of max gear potential
- **Epic**: 60-80% of max gear potential
- **Legendary**: 80-100% of max gear potential

## 🔧 Implementation Notes

### **Database Storage**

```typescript
// Hero stats (base points allocated)
statsSxma: {
  strength: number,     // 5-100 points
  mastery: number,      // 5-100 points
  agility: number,      // 5-100 points
  health: number,       // 5-100 points
  knowledge: number     // 5-100 points (future use)
}

// Item template bonuses
itemTemplateSxma: {
  baseStats: jsonb     // Gear bonuses to calculated stats
}
```

### **Final Stat Calculation**

```typescript
// Total stats = Base stats calculation + Gear bonuses
const finalStats = {
  baseDamageBoost: strength * 1.5 + gearBonuses.baseDamageBoost,
  critMultiplier: 1.5 + mastery * 0.02 + gearBonuses.critMultiplier,
  critChance: mastery * 0.3 + gearBonuses.critChance,
  evadeChance: agility * 0.3 + gearBonuses.evadeChance,
  fastChance: agility * 0.2 + gearBonuses.fastChance,
  hp: health * 100 + gearBonuses.health,
};
```

## ⚠️ Important Rules

1. **Stat Point Allocation**: Heroes can only max ONE stat to 100 points
2. **Gear Dependency**: Reaching maximum effectiveness requires both maxed stats
   AND high-tier gear
3. **Balance**: No single stat should dominate - encourage diverse builds
4. **Future Proofing**: Knowledge stat reserved for magic system expansion
5. **Item Creation**: Always consider these limits when designing
   `itemTemplateSxma` entries

---

**Use this reference when creating items, validating hero builds, or
implementing new game features.**
