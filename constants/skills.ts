import type { SkillId } from "../types/fableProtocol";

export type CombatSkill = {
  id: SkillId;
  name: string;
  cost: number;
  damageMultiplier: number;
  guaranteedCrit: boolean;
};

export const COMBAT_SKILLS: Readonly<Record<SkillId, CombatSkill>> = {
  basic: {
    id: "basic",
    name: "Strike",
    cost: 0,
    damageMultiplier: 1,
    guaranteedCrit: false,
  },
  precise: {
    id: "precise",
    name: "Precise",
    cost: 30,
    damageMultiplier: 1,
    guaranteedCrit: true,
  },
  heavy: {
    id: "heavy",
    name: "Heavy",
    cost: 50,
    damageMultiplier: 2,
    guaranteedCrit: false,
  },
};
