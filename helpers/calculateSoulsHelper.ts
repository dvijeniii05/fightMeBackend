export const calculateSouls = (
  isWinner: boolean,
  playerLevel: number,
  botLevel: number,
  isDungeon?: boolean,
): number => {
  if (!isWinner) {
    return 0;
  }

  // Starting from level 1: 8-12 souls
  // Each level increases the range by 4
  // Level 1: 8-12, Level 2: 12-16, Level 3: 16-20, etc.
  const minSouls = 4 * (playerLevel + 1);
  const maxSouls = 4 * (playerLevel + 2);

  const modifier = botLevel / playerLevel;

  const souls =
    Math.floor(Math.random() * (maxSouls - minSouls + 1)) + minSouls;

  if (isDungeon) {
    return Math.floor((modifier * souls) / 5);
  }

  return souls;
};
