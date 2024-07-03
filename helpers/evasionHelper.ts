export const isItEvadedHelper = (evasionChance: number) => {
  console.log("Evasion-CHANCE", evasionChance);
  const maxAllowedTotalEvasionChance = 50;

  const allowedEvasion =
    evasionChance > maxAllowedTotalEvasionChance
      ? maxAllowedTotalEvasionChance
      : evasionChance;

  console.log("Allowed_Evasion", allowedEvasion);

  const rawEvasionPool = new Array(100);
  const populatedEvasionPool = rawEvasionPool.fill(
    1,
    0,
    Math.round(allowedEvasion)
  );
  console.log("MODIFIED_Evasion-CHANCE", populatedEvasionPool);
  // NEXT step would be to get a random value betweeen 0 and 99 to pick element from populatedEvasionPool
  const getRandomInt = (max: number) => Math.floor(Math.random() * max);
  return populatedEvasionPool[getRandomInt(100)] == 1;
};
