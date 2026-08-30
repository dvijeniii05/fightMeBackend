import { COMBAT_SKILLS } from "../constants/skills";
import type { BlockTier, SkillId } from "../types/fableProtocol";
import type { CalculatedStatsProps } from "./calculateStatsHelper";
import { isItCritHelper } from "./critHelpers";
import { isItEvadedHelper } from "./evasionHelper";
import { isItFastHelper } from "./fastHelper";
import { incomingDamageHelper } from "./incomingDamageHelper";

type StrikeStats = Omit<CalculatedStatsProps, "hp">;

type StrikeDefense =
  | { blockTier: BlockTier }
  | {
      attackZone: number;
      attackTime: number;
      blockZone: number;
      blockTime: number;
    };

type StrikeOutcomes = {
  isCrit: boolean;
  isEvade: boolean;
  isFast: boolean;
};

export type ResolveStrikeProps = {
  attacker: {
    stats: StrikeStats;
    nextStrikeBuff?: { damageMult: number };
  };
  defender: {
    hp: number;
    stats: Pick<StrikeStats, "evadeChance">;
  };
  skillId: SkillId;
  defense: StrikeDefense;
  outcomes?: StrikeOutcomes;
};

export type ResolveStrikeResult = {
  damage: number;
  damageBeforeEvade: number;
  isCrit: boolean;
  isEvade: boolean;
  isFast: boolean;
  blockTier: BlockTier;
  isBlocked: boolean;
  block: string;
  resultingHp: number;
  consumedBuff: { damageMult: number } | null;
};

export const resolveStrike = ({
  attacker,
  defender,
  skillId,
  defense,
  outcomes,
}: ResolveStrikeProps): ResolveStrikeResult => {
  const skill = COMBAT_SKILLS[skillId];
  const skillCritChance =
    skill.id === "basic" ? 0 : attacker.stats.skillCritChance;
  const isCrit = skill.guaranteedCrit
    ? true
    : (outcomes?.isCrit ??
      isItCritHelper(attacker.stats.critChance + skillCritChance));
  const isEvade =
    outcomes?.isEvade ?? isItEvadedHelper(defender.stats.evadeChance);
  const isFast = skill.guaranteedFast
    ? true
    : (outcomes?.isFast ?? isItFastHelper(attacker.stats.fastChance));
  const critMultiplier =
    attacker.stats.critMultiplier + skill.bonusCritMultiplier;

  const potentialDamage = Math.round(
    attacker.stats.baseDamageBoost *
      (isCrit ? critMultiplier : 1) *
      (isFast ? 2.5 : 1),
  );

  const incomingDamage =
    "blockTier" in defense
      ? incomingDamageHelper({
          blockTier: defense.blockTier,
          potentialIncomingDamage: potentialDamage,
        })
      : incomingDamageHelper({
          ...defense,
          baseIncomingDamage: attacker.stats.baseDamageBoost,
          potentialIncomingDamage: potentialDamage,
        });

  const skillDamage = Math.round(
    incomingDamage.damage * skill.damageMultiplier,
  );
  const consumedBuff = attacker.nextStrikeBuff
    ? { ...attacker.nextStrikeBuff }
    : null;
  const damageBeforeEvade = Math.round(
    skillDamage * (consumedBuff?.damageMult ?? 1),
  );
  const damage = isEvade ? 0 : damageBeforeEvade;
  const blockTier =
    "blockTier" in defense
      ? defense.blockTier
      : incomingDamage.isBlocked
        ? "basic"
        : "none";

  return {
    damage,
    damageBeforeEvade,
    isCrit,
    isEvade,
    isFast,
    blockTier,
    isBlocked: incomingDamage.isBlocked,
    block: incomingDamage.block,
    resultingHp: Math.round(Math.max(0, defender.hp - damage)),
    consumedBuff,
  };
};
