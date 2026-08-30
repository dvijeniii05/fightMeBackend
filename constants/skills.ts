import type { SkillId } from "../types/fableProtocol";

export type CombatSkill = {
  id: SkillId;
  name: string;
  cost: number;
  unlockLevel: number | null;
  unlockDeed: "critical_strikes" | null;
  damageMultiplier: number;
  guaranteedCrit: boolean;
  bonusCritMultiplier: number;
  guaranteedFast: boolean;
  blockable: boolean;
  parryable: boolean;
  lifeStealPercent: number;
  requiresParryBuff: boolean;
  parryBuffBonusMultiplier: number;
  deniesOpponentBlock: boolean;
};

export const COMBAT_SKILLS: Readonly<Record<SkillId, CombatSkill>> = {
  basic: {
    id: "basic",
    name: "Strike",
    cost: 0,
    unlockLevel: 1,
    unlockDeed: null,
    damageMultiplier: 1,
    guaranteedCrit: false,
    bonusCritMultiplier: 0,
    guaranteedFast: false,
    blockable: true,
    parryable: true,
    lifeStealPercent: 0,
    requiresParryBuff: false,
    parryBuffBonusMultiplier: 0,
    deniesOpponentBlock: false,
  },
  precise: {
    id: "precise",
    name: "Precise Strike",
    cost: 30,
    unlockLevel: 1,
    unlockDeed: null,
    damageMultiplier: 1,
    guaranteedCrit: true,
    bonusCritMultiplier: 0,
    guaranteedFast: false,
    blockable: true,
    parryable: false,
    lifeStealPercent: 0,
    requiresParryBuff: false,
    parryBuffBonusMultiplier: 0,
    deniesOpponentBlock: false,
  },
  heavy: {
    id: "heavy",
    name: "Heavy Strike",
    cost: 50,
    unlockLevel: 4,
    unlockDeed: null,
    damageMultiplier: 2,
    guaranteedCrit: false,
    bonusCritMultiplier: 0,
    guaranteedFast: false,
    blockable: true,
    parryable: false,
    lifeStealPercent: 0,
    requiresParryBuff: false,
    parryBuffBonusMultiplier: 0,
    deniesOpponentBlock: false,
  },
  sunder: {
    id: "sunder",
    name: "Sunder",
    cost: 90,
    unlockLevel: 8,
    unlockDeed: null,
    damageMultiplier: 1.5,
    guaranteedCrit: false,
    bonusCritMultiplier: 0,
    guaranteedFast: false,
    blockable: false,
    parryable: false,
    lifeStealPercent: 0,
    requiresParryBuff: false,
    parryBuffBonusMultiplier: 0,
    deniesOpponentBlock: false,
  },
  leech: {
    id: "leech",
    name: "Leech Strike",
    cost: 130,
    unlockLevel: 13,
    unlockDeed: null,
    damageMultiplier: 1.75,
    guaranteedCrit: false,
    bonusCritMultiplier: 0,
    guaranteedFast: false,
    blockable: true,
    parryable: false,
    lifeStealPercent: 30,
    requiresParryBuff: false,
    parryBuffBonusMultiplier: 0,
    deniesOpponentBlock: false,
  },
  hidden: {
    id: "hidden",
    name: "Hidden Strike",
    cost: 40,
    unlockLevel: null,
    unlockDeed: "critical_strikes",
    damageMultiplier: 1,
    guaranteedCrit: true,
    bonusCritMultiplier: 1,
    guaranteedFast: false,
    blockable: true,
    parryable: false,
    lifeStealPercent: 0,
    requiresParryBuff: false,
    parryBuffBonusMultiplier: 0,
    deniesOpponentBlock: false,
  },
  perfect: {
    id: "perfect",
    name: "Perfect Strike",
    cost: 200,
    unlockLevel: 21,
    unlockDeed: null,
    damageMultiplier: 1,
    guaranteedCrit: false,
    bonusCritMultiplier: 0,
    guaranteedFast: false,
    blockable: true,
    parryable: false,
    lifeStealPercent: 0,
    requiresParryBuff: true,
    parryBuffBonusMultiplier: 2,
    deniesOpponentBlock: true,
  },
};

export const SPECIAL_SKILL_SLOT_COUNT = 3;
export const DEFAULT_SKILL_LOADOUT: SkillId[] = ["precise"];
export const CRITICAL_STRIKES_DEED_TARGET = 100;

export const SKILL_IDS = Object.keys(COMBAT_SKILLS) as SkillId[];

export const isSkillId = (value: unknown): value is SkillId =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(COMBAT_SKILLS, value);

export const getMaxStamina = (level: number) =>
  100 + 25 * (Math.max(1, level) - 1);

export const isSkillUnlocked = (
  skillId: SkillId,
  level: number,
  criticalStrikes: number,
) => {
  const skill = COMBAT_SKILLS[skillId];
  if (skill.id === "basic") return true;
  if (skill.unlockLevel !== null) return level >= skill.unlockLevel;
  return (
    skill.unlockDeed === "critical_strikes" &&
    criticalStrikes >= CRITICAL_STRIKES_DEED_TARGET
  );
};

export const isValidSkillLoadout = (
  value: unknown,
  level: number,
  criticalStrikes: number,
): value is SkillId[] => {
  if (!Array.isArray(value) || value.length > SPECIAL_SKILL_SLOT_COUNT) {
    return false;
  }

  const uniqueSkills = new Set(value);
  return (
    uniqueSkills.size === value.length &&
    value.every(
      skillId =>
        isSkillId(skillId) &&
        skillId !== "basic" &&
        isSkillUnlocked(skillId, level, criticalStrikes),
    )
  );
};
