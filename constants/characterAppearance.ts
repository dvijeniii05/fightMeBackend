export const HERO_AVATAR_IDS = new Set([1, 2, 3, 4, 5, 6]);
export const HERO_SPRITE_IDS = new Set([1, 2, 3, 4, 5, 6]);
export const BOT_AVATAR_IDS = new Set([101, 102, 103, 104, 105, 106, 107]);

export const isAvatarId = (value: unknown): value is number =>
  Number.isInteger(value) &&
  (HERO_AVATAR_IDS.has(value as number) || BOT_AVATAR_IDS.has(value as number));

export const isHeroAvatarId = (value: unknown): value is number =>
  Number.isInteger(value) && HERO_AVATAR_IDS.has(value as number);

export const isSpriteId = (value: unknown): value is number =>
  Number.isInteger(value) && HERO_SPRITE_IDS.has(value as number);
