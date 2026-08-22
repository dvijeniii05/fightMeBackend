import {
  BASIC_BLOCK_REDUCTION,
  BLOCK_TOLERANCE_MS,
} from "../constants/combatTiming.ts";
import type { BlockTier } from "../types/fableProtocol";

interface LegacyProps {
  blockZone: number;
  attackZone: number;
  blockTime: number;
  attackTime: number;
  baseIncomingDamage: number;
  potentialIncomingDamage: number;
}

interface TierProps {
  blockTier: BlockTier;
  potentialIncomingDamage: number;
}

type Props = LegacyProps | TierProps;

//TODO: enhance this to block by percentage, not full damage
export const incomingDamageHelper = (props: Props) => {
  console.log("Incoming_Damage_helper");

  if ("blockTier" in props) {
    if (props.blockTier === "perfect") {
      return {
        damage: 0,
        block: "100%",
        isBlocked: true,
      };
    }

    if (props.blockTier === "basic") {
      return {
        damage: Math.round(
          props.potentialIncomingDamage * (1 - BASIC_BLOCK_REDUCTION),
        ),
        block: `${Math.round(BASIC_BLOCK_REDUCTION * 100)}%`,
        isBlocked: true,
      };
    }

    return {
      damage: Math.round(props.potentialIncomingDamage),
      block: "0%",
      isBlocked: false,
    };
  }

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
