import type { RoomType, Round } from "../types/roomType";
import { calcRoundResults } from "./calculateDamageHelper";

export const calculateRoundOutcome = (roundData: {
  heroId: string;
  isPvp: boolean;
  room: RoomType;
  selected: {
    attackZone: number;
    blockZone: number;
    attackTime: number;
    blockTime: number;
    opponentAttackZone: number;
    opponentBlockZone: number;
    opponentAttackTime: number;
    opponentBlockTime: number;
  };
}): Round => {
  // Function implementation here
  if (roundData.isPvp) {
    // Handle PvP round outcome calculation

    return {} as Round; // Placeholder return, implement PvP logic here
  } else {
    // Handle PvE round outcome calculation
    const player = roundData.room.players[0];
    const bot = roundData.room.players[1];

    const playerAttack = {
      zone: roundData.selected.attackZone,
      time: roundData.selected.attackTime,
    };
    const playerBlock = {
      zone: roundData.selected.blockZone,
      time: roundData.selected.blockTime,
    };

    const botAttack = {
      zone: roundData.selected.opponentAttackZone,
      time: roundData.selected.opponentAttackTime,
    };
    const botBlock = {
      zone: roundData.selected.opponentBlockZone,
      time: roundData.selected.opponentBlockTime,
    };

    //Calculate outcomes to send to both players
    const roundOutcome = calcRoundResults(
      {
        attackZone: playerAttack!.zone,
        attackTime: playerAttack.time,
        blockZone: playerBlock!.zone,
        blockTime: playerBlock.time,
        maxHp: player.maxHp,
        hp: player.hp,
        ...player.stats,
      },
      {
        attackZone: botAttack!.zone,
        attackTime: botAttack.time,
        blockZone: botBlock!.zone,
        blockTime: botBlock.time,
        maxHp: bot.maxHp,
        hp: bot.hp,
        ...bot.stats,
      },
    );

    const newRound: Round = {
      roundNumber: roundData.room.currentRound,
      attackSelections: [
        {
          playerId: roundData.heroId,
          attackZone: roundData.selected.attackZone,
          attackTime: roundData.selected.attackTime,
        },
        {
          playerId: bot.id,
          attackZone: botAttack.zone,
          attackTime: botAttack.time,
        },
      ],
      blockSelections: [
        {
          playerId: roundData.heroId,
          blockZone: roundData.selected.blockZone,
          blockTime: roundData.selected.blockTime,
        },
        {
          playerId: bot.id,
          blockZone: botBlock.zone,
          blockTime: botBlock.time,
        },
      ],
      results: [
        { playerId: player.id, ...roundOutcome.playerOne },
        { playerId: bot.id, ...roundOutcome.playerTwo },
      ],
    };

    return newRound;
    // roundData.room.rounds.unshift(newRound);

    // // console.log("PvE results:", newRound.results);

    // player.hp = newRound.results.find(res => res.playerId === player.id)?.hp!;
    // bot.hp = newRound.results.find(res => res.playerId === bot.id)?.hp!;

    // const hasMatchFinished = player.hp <= 0 || bot.hp <= 0;

    // if (hasMatchFinished) {
    // } else {
    //   roundData.room.currentRound++;
    // }
  }
};
