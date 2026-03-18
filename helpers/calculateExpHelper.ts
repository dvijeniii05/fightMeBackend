/**
 * Calculates experience points awarded after a fight
 * @param isWinner - Whether the player won the fight
 * @param playerLevel - The player's current level
 * @param botLevel - The bot's level
 * @param isDungeon - Optional flag indicating if the fight was in a dungeon
 * @returns Experience points to award
 */
export const calculateExp = (
  isWinner: boolean,
  playerLevel: number,
  botLevel: number,
  isDungeon?: boolean,
): number => {
  if (!isWinner) {
    return 0;
  }

  // Generate random exp in range 20-30 for normal wins
  const minExp = 20;
  const maxExp = 30;
  const baseExp = Math.floor(Math.random() * (maxExp - minExp + 1)) + minExp;

  // +10% per bot level above player, -10% per bot level below player, min 0%
  const modifier = Math.max(1 + (botLevel - playerLevel) * 0.1, 0);

  // If it's a dungeon fight, award half the exp (10-15 range)
  if (isDungeon) {
    return Math.floor((baseExp * modifier) / 2);
  }

  return Math.floor(baseExp * modifier);
};
