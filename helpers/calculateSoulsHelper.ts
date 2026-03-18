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

  // +10% per bot level above player, -10% per bot level below player, min 0%
  const modifier = Math.max(1 + (botLevel - playerLevel) * 0.1, 0);

  const souls =
    Math.floor(Math.random() * (maxSouls - minSouls + 1)) + minSouls;

  if (isDungeon) {
    return Math.floor((modifier * souls) / 5);
  }

  return Math.floor(modifier * souls);
};
