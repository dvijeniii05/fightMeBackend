/**
 * Calculates experience points awarded after a fight
 * @param isWinner - Whether the player won the fight
 * @param isDungeon - Optional flag indicating if the fight was in a dungeon
 * @returns Experience points to award
 */
export const calculateExp = (
  isWinner: boolean,
  isDungeon?: boolean,
): number => {
  if (!isWinner) {
    return 0;
  }

  // Generate random exp in range 20-30 for normal wins
  const minExp = 20;
  const maxExp = 30;
  const baseExp = Math.floor(Math.random() * (maxExp - minExp + 1)) + minExp;

  // If it's a dungeon fight, award half the exp (10-15 range)
  if (isDungeon) {
    return Math.floor(baseExp / 2);
  }

  return baseExp;
};
