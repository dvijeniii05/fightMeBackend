export const isItCritHelper = (critChance: number) => {
  console.log("Crite-CHANCE", critChance);
  const maxAllowedTotalCritChance = 70;

  const allowedCrit =
    critChance > maxAllowedTotalCritChance
      ? maxAllowedTotalCritChance
      : critChance;

  console.log("Allowed_CRIT", allowedCrit);

  const rawCritPool = new Array(100);
  const populatedCritPool = rawCritPool.fill(1, 0, Math.round(allowedCrit));
  console.log("MODIFIED_Crit-CHANCE", populatedCritPool);
  // NEXT step would be to get a random value betweeen 0 and 99 to pick element from populatedCritPool
  const getRandomInt = (max: number) => Math.floor(Math.random() * max);
  return populatedCritPool[getRandomInt(100)] == 1;
};
