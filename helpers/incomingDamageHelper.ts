interface Props {
  blockTime: number;
  attackTime: number;
  baseIncomingDamage: number;
  potentialIncomingDamage: number;
}

//TODO: enhance this to block by percentage, not full damage
export const incomingDamageHelper = (props: Props) => {
  console.log("Incoming_Damage_helper");

  const isBlocked = props.blockTime === props.attackTime;

  //Full damage as no block involved
  if (isBlocked)
    return {
      damage: Math.round(
        props.potentialIncomingDamage - props.baseIncomingDamage,
      ),
      block:
        Math.round(
          (props.baseIncomingDamage / props.potentialIncomingDamage) * 100,
        ).toString() + "%",
      isBlocked: true,
    };

  return {
    damage: Math.round(props.potentialIncomingDamage),
    block: "0%",
    isBlocked: false,
  };
};
