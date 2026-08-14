import { BLOCK_TOLERANCE_MS } from "../constants/combatTiming.ts";

interface Props {
  blockZone: number;
  attackZone: number;
  blockTime: number;
  attackTime: number;
  baseIncomingDamage: number;
  potentialIncomingDamage: number;
}

//TODO: enhance this to block by percentage, not full damage
export const incomingDamageHelper = (props: Props) => {
  console.log("Incoming_Damage_helper");

  const hasValidTiming =
    Number.isFinite(props.blockTime) && Number.isFinite(props.attackTime);
  const blockLeadMs = props.attackTime - props.blockTime;

  const isBlocked =
    props.blockZone === props.attackZone &&
    hasValidTiming &&
    blockLeadMs >= 0 &&
    blockLeadMs <= BLOCK_TOLERANCE_MS;

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
