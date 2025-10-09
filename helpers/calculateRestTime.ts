export const calculateRestTime = (maxHp?: number, currHp?: number) => {
  /*
  Synopsis ==> Players should rest up until a specific time (unix in sec) to be able to start next fight.
  This time should be proportional to the current Hp status AND scalable of the some stats & buffs OR Premium status in future.
  The restUntil values should be lower for new players i.e. making it more attractive at the start ANd scale with level.
  Estimates: Given that maxHp possible is 20000 ans the startHp is 100 it should take 1 min to rest initially from 0% to 100% AND
  should take max 15-20 minutes to rest in the end-game with no buffs & premium.
  */
  //Setting to 1 min by default during development
  return Math.floor(Date.now() / 1000) + 60;
};
