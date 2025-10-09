import { incomingDamageHelper } from "./incomingDamageHelper";

const attackRangeB = {
  min: 80,
  max: 100,
};

const blockRangeA = {
  min: 80,
  max: 86.5,
};

const baseDamageB = 40;

const calc_val = incomingDamageHelper({
  blockRange: blockRangeA,
  incomingAttackRange: attackRangeB,
  incomingDamage: baseDamageB,
});
console.log("Calc_val", calc_val);
