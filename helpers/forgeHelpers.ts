import { type SelectHero } from "../drizzle/schema/hero";
import { type SelectFullItem } from "../drizzle/schema/item";

export const isEnoughShards = (
  itemInstance: SelectFullItem,
  heroData: SelectHero,
) => {
  // Get current forge level and next forge level
  const currentForgeLevel = itemInstance.forgeLevel ?? 0;
  const nextForgeLevel = currentForgeLevel + 1;

  // Get the cost requirements for the next forge level
  const nextLevelRequirements =
    itemInstance.template.forgeLevels![nextForgeLevel];
  if (!nextLevelRequirements) {
    return false;
  }

  const { cost, costType } = nextLevelRequirements;

  // Get hero's shards based on cost type
  let heroShards = 0;
  switch (costType.toUpperCase()) {
    case "A":
      heroShards = heroData.shardsA;
      break;
    case "B":
      heroShards = heroData.shardsB;
      break;
    case "C":
      heroShards = heroData.shardsC;
      break;
    default:
      return false; // Unknown shard type
  }

  // Return true if hero has enough shards
  return heroShards >= cost;
};

export const calculateShardDeductions = (
  itemInstance: SelectFullItem,
  heroData: SelectHero,
) => {
  const currentForgeLevel = itemInstance.forgeLevel ?? 0;
  const nextForgeLevel = currentForgeLevel + 1;
  const nextLevelRequirements =
    itemInstance.template.forgeLevels![nextForgeLevel];

  const { cost, costType } = nextLevelRequirements;
  const costTypeUpper = costType.toUpperCase();

  return {
    shardsA: heroData.shardsA - (costTypeUpper === "A" ? cost : 0),
    shardsB: heroData.shardsB - (costTypeUpper === "B" ? cost : 0),
    shardsC: heroData.shardsC - (costTypeUpper === "C" ? cost : 0),
  };
};

export const isForgeSuccess = (successRate: number): boolean => {
  const roll = Math.random() * 100; // Random number between 0-99.999...
  return roll < successRate;
};
