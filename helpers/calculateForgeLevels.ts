export const calculateForgeLevels = (
  baseStats: Record<string, number>,
  primaryStatKey: string,
  secondaryStatKey: string,
  secondaryStatBoostPercent: number = 10, // TBC, default 10% per level
) => {
  const primaryBaseValue = baseStats[primaryStatKey];
  const secondaryBaseValue = baseStats[secondaryStatKey];

  const forgeLevels: Record<
    string,
    Record<string, number | string[] | undefined | string>
  > = {};

  // Define shard costs, types, and success rates based on game mechanics
  const shardData = [
    { cost: 0, costType: "A", successRate: 90 }, // Level 0 (base)
    { cost: 20, costType: "A", successRate: 90 }, // Level 1 (0->1)
    { cost: 40, costType: "A", successRate: 90 }, // Level 2 (1->2)
    { cost: 60, costType: "A", successRate: 90 }, // Level 3 (2->3)
    { cost: 20, costType: "B", successRate: 60 }, // Level 4 (3->4)
    { cost: 40, costType: "B", successRate: 60 }, // Level 5 (4->5)
    { cost: 60, costType: "B", successRate: 60 }, // Level 6 (5->6)
    { cost: 20, costType: "C", successRate: 30 }, // Level 7 (6->7)
    { cost: 40, costType: "C", successRate: 30 }, // Level 8 (7->8)
    { cost: 60, costType: "C", successRate: 30 }, // Level 9 (8->9)
  ];

  // Levels 0-6: Primary stat +10% per level
  for (let level = 0; level <= 6; level++) {
    forgeLevels[level.toString()] = {
      [primaryStatKey]: Math.round(primaryBaseValue * level * 0.1),
      cost: shardData[level].cost,
      costType: shardData[level].costType,
      successRate: shardData[level].successRate,
    };
  }

  // Levels 7-8: Secondary stat boost
  for (let level = 7; level <= 8; level++) {
    const secondaryBoost = (level - 6) * (secondaryStatBoostPercent / 100);
    forgeLevels[level.toString()] = {
      [primaryStatKey]: Math.round(primaryBaseValue * 0.6), // stays at +6 level
      [secondaryStatKey]: Math.round(secondaryBaseValue * secondaryBoost),
      cost: shardData[level].cost,
      costType: shardData[level].costType,
      successRate: shardData[level].successRate,
    };
  }

  // Level 9: +40% more primary stat (total +100%), secondary stays, plus awakening
  forgeLevels["9"] = {
    [primaryStatKey]: Math.round(primaryBaseValue * 1.0), // +100% total
    [secondaryStatKey]: Math.round(
      secondaryBaseValue * 2 * (secondaryStatBoostPercent / 100),
    ), // stays at +8 level
    cost: shardData[9].cost,
    costType: shardData[9].costType,
    successRate: shardData[9].successRate,
    awakeningOptions: [], // To be selected by player
  };

  return forgeLevels;
};
