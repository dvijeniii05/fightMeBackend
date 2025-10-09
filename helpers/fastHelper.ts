export const isItFastHelper = (fastChance: number) => {
  console.log("Fast-CHANCE", fastChance);
  const maxAllowedTotalFastChance = 50;

  const allowedFast =
    fastChance > maxAllowedTotalFastChance
      ? maxAllowedTotalFastChance
      : fastChance;

  console.log("Allowed_Fast_Attack", allowedFast);

  const rawFastPool = new Array(100);
  const populatedFastPool = rawFastPool.fill(1, 0, Math.round(allowedFast));
  console.log("MODIFIED_Fast-CHANCE", populatedFastPool);
  // NEXT step would be to get a random value betweeen 0 and 99 to pick element from populatedFastPool
  const getRandomInt = (max: number) => Math.floor(Math.random() * max);
  return populatedFastPool[getRandomInt(100)] == 1;
};
