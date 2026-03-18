/**
 * HP regeneration per 2-second tick, scaled by maxHp.
 *
 * Formula: regenPerTick = REGEN_COEFFICIENT * maxHp^REGEN_EXPONENT
 *
 * Derived from target regen times:
 *   50 HP   → ~3 min
 *   500 HP  → ~15 min
 *   1000 HP → ~25 min
 *   2000 HP → ~40 min
 */
const REGEN_COEFFICIENT = 0.18;
const REGEN_EXPONENT = 0.29;

export const calculateRegenRate = (maxHp: number): number => {
  return REGEN_COEFFICIENT * Math.pow(maxHp, REGEN_EXPONENT);
};
