const dummy = {
  strength: 10,
  mastery: 10,
  agility: 10,
  health: 10,
  knowledge: 10,
};

export interface StatsProps {
  strength: number;
  mastery: number;
  agility: number;
  health: number;
  knowledge: number;
}

export interface GearStatsProps {
  hp: number;
  damage: number;
  attackArea: number;
  blockArea: number;
  critChance: number;
  critMultiplier: number;
  evadeChance: number;
  fastChance: number;
  skillCritChance: number;
  //TODO: add more stats specific to gear + awakenings?
}

export interface CalculatedStatsProps {
  hp: number;
  baseDamageBoost: number;
  attackArea: number;
  blockArea: number;
  critChance: number;
  critMultiplier: number;
  evadeChance: number;
  fastChance: number;
  skillCritChance: number;
}

//TODO:  should calculate health + default damage + cirt chance + crit mult + evasions chance + 2x damage chance etc

// !! IMPORTANT: create a private npm package for shared calculation engine between client and server
export const calculateStatsHelper = (
  stats: StatsProps,
  gearStats: GearStatsProps,
): CalculatedStatsProps => {
  const capped = (val: number) => Math.min(100, Math.max(0, val)); // Enforce 0–100
  //TODO: should include stats & buffs calc from gear & weapon

  const strength = capped(stats.strength);
  const mastery = capped(stats.mastery);
  const agility = capped(stats.agility);
  const health = capped(stats.health);
  const knowledge = capped(stats.knowledge);

  const baseDamageBoost =
    Math.round(strength * 1.5 * 10) / 10 + gearStats.damage;
  const attackArea =
    Math.round(strength * 0.01 * 10) / 10 + gearStats.attackArea;
  const blockArea =
    Math.round((strength * 0.1 + health * 0.1) * 10) / 10 + gearStats.blockArea;
  const hp = Math.round(health * 100) + gearStats.hp;

  const critChance = Math.round(mastery * 0.3 * 10) / 10 + gearStats.critChance;
  const critMultiplier =
    Math.round((1.5 + mastery * 0.02) * 100) / 100 + gearStats.critMultiplier;

  const evadeChance =
    Math.round(agility * 0.3 * 10) / 10 + gearStats.evadeChance;
  const fastChance = Math.round(agility * 0.2 * 10) / 10 + gearStats.fastChance;

  const skillCritChance =
    Math.round(knowledge * 0.15 * 10) / 10 + gearStats.skillCritChance;

  return {
    hp,
    baseDamageBoost,
    attackArea,
    blockArea,
    critChance,
    critMultiplier,
    evadeChance,
    fastChance,
    skillCritChance,
  };
};
