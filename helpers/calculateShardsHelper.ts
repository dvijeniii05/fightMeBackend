export const calculateShards = (
  isWinner: boolean,
  shardsType: string,
): { a: number; b: number; c: number } => {
  if (!isWinner) {
    return { a: 0, b: 0, c: 0 };
  }

  const minShards = 3;
  const maxShards = 7;

  const modifier = 1; //TODO: modifier to be implemented in future linked to premium or something

  const shards =
    Math.floor(Math.random() * (maxShards - minShards + 1)) + minShards;

  const newSHards = shards * modifier;

  return {
    a: shardsType === "a" ? newSHards : 0,
    b: shardsType === "b" ? newSHards : 0,
    c: shardsType === "c" ? newSHards : 0,
  };
};
