interface Props {
  blockRange: {
    min: number;
    max: number;
  };
  incomingAttackRange: {
    min: number;
    max: number;
  };
  incomingDamage: number;
}

export const incomingDamageHelper = (props: Props) => {
  console.log("Incoming_Damage_helper");
  const attackArea =
    props.incomingAttackRange.max - props.incomingAttackRange.min;

  //Calc overlap
  const overlapMin = Math.max(
    props.incomingAttackRange.min,
    props.blockRange.min,
  );
  const overlapMax = Math.min(
    props.incomingAttackRange.max,
    props.blockRange.max,
  );
  const overlap = Math.max(0, overlapMax - overlapMin);

  //Full damage as no block involved
  if (overlap === 0)
    return { damage: props.incomingDamage, block: "0%", isBlocked: false };

  const blockPercentage = overlap / attackArea;

  //0 Damage as more than 50% is blocked
  if (blockPercentage > 0.5)
    return { damage: 0, block: "100%", isBlocked: true };

  const actualDamage = props.incomingDamage * (1 - blockPercentage);
  console.log("Block % ==>", blockPercentage);

  return {
    damage: Math.round(actualDamage),
    block: `${Math.round(blockPercentage * 100)}%`,
    isBlocked: true,
  };
};
