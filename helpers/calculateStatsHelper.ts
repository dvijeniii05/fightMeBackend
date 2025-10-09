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
): CalculatedStatsProps => {
  const capped = (val: number) => Math.min(100, Math.max(0, val)); // Enforce 0–100
  //TODO: should include stats & buffs calc from gear & weapon

  const strength = capped(stats.strength);
  const mastery = capped(stats.mastery);
  const agility = capped(stats.agility);
  const health = capped(stats.health);
  const knowledge = capped(stats.knowledge);

  const baseDamageBoost = Math.round(strength * 1.5 * 10) / 10;
  const attackArea = Math.round(strength * 0.01 * 10) / 10; //max 100 including stats AND gearing (half of the total possible attackrange i.e. 200) ??? //TODO: rework this. Should have a minimal default value and skale with specific stats AND weapons
  const blockArea = Math.round((strength * 0.1 + health * 0.1) * 10) / 10; //TODO: rework this math
  const hp = Math.round(health * 100);

  const critChance = Math.round(mastery * 0.3 * 10) / 10; // in %. Max 70% Total (30 stats + 40 gear)
  const critMultiplier = Math.round((1.5 + mastery * 0.02) * 100) / 100; // base 1.5x + 0.02 per point. Max 6.5 (1.5 + 2 stats + 3 gear)

  const evadeChance = Math.round(agility * 0.3 * 10) / 10; // in %. Max 70% Total (30 stats + 40 gear)
  const fastChance = Math.round(agility * 0.2 * 10) / 10; // in %. Max 50% Total (20 stats + 30 gear)

  const skillCritChance = Math.round(knowledge * 0.15 * 10) / 10; // in %, x5 dmg on skills //TODO: Need a rework and more stats attached to knowledge

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
