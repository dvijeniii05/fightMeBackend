export type ActiveHeroesType = {
  nickname: string;
  lvl: number;
  maxHp: number;
  currHp: number;
  status: "idle" | "busy"; //Available or Busy i.e. in a fight or a dungeon
};
