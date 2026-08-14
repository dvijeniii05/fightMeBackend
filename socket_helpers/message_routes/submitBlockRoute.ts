import { calculateRoundOutcome } from "../../helpers/calculateRoundOutcome";
import {
  activeHeroesCache,
  fightRoomsCache,
  userRoomsCache,
} from "../socketCache";
import { getMatchResults } from "../../helpers/getMatchResults";

export const submitBlockRoute = async (
  server: Bun.Server,
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
  parsedMessage: {
    heroId: string;
    selected: {
      blockZone: number;
      blockTime: number;
    };
  },
) => {
  const roomId = userRoomsCache.get(parsedMessage.heroId)?.id;
  const room = roomId ? fightRoomsCache.get(roomId) : undefined;
  const round = room?.rounds.find(
    existingRound => existingRound.roundNumber === room.currentRound,
  );
  if (!room || !round) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Cannot submit block for this fight room",
      }),
    );
    return;
  }

  if (room.matchResult) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Match has already ended, cannot submit block",
      }),
    );
    return;
  }

  console.log("ROOM_DATA", JSON.stringify(room));

  //TODO: all checks below are additional guardrails, but they should not be needed if the frontend is working properly.e

  // const opp = room.players.find(player => player.id !== parsedMessage.heroId);

  // const attackSelection = round.attackSelections.find(
  //   selection => selection.playerId === parsedMessage.heroId,
  // );
  // const oppAttackSelection = round.attackSelections.find(
  //   selection => selection.playerId === opp?.id,
  // );

  // if (
  //   round.blockSelections.some(
  //     selection => selection.playerId === parsedMessage.heroId,
  //   )
  // ) {
  //   ws.send(
  //     JSON.stringify({
  //       type: "error",
  //       message: "Block already submitted for this round",
  //     }),
  //   );
  //   return;
  // }

  round.blockSelections.push({
    playerId: parsedMessage.heroId,
    blockZone: parsedMessage.selected.blockZone,
    blockTime: parsedMessage.selected.blockTime,
  });

  //We need to push random block values ONLY for PVE, in PvP this would be skipped as values are already submitted by the players themselves
  if (!room.isPvp) {
    const bot = room.players.find(player => player.id !== parsedMessage.heroId);
    if (
      bot &&
      !round.blockSelections.some(selection => selection.playerId === bot.id)
    ) {
      const playerAttack = round.attackSelections.find(
        selection => selection.playerId === parsedMessage.heroId,
      );

      if (!playerAttack) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Cannot select bot block before player attack",
          }),
        );
        return;
      }

      const shouldBlock = Math.random() < 0.5;
      const missedZoneOffset = Math.floor(Math.random() * 3) + 1;

      round.blockSelections.push({
        playerId: bot.id,
        blockZone: shouldBlock
          ? playerAttack.attackZone
          : ((playerAttack.attackZone - 1 + missedZoneOffset) % 4) + 1,
        blockTime: playerAttack.attackTime,
      });
    }
  }

  //If both players submitted blocks, we can calculate the round outcome and send it to both players
  if (round.blockSelections.length === 2) {
    const playerOne = room.players[0];
    const playerTwo = room.players[1];

    const playerOneAttack = round.attackSelections.find(
      selection => selection.playerId === playerOne.id,
    );
    const playerTwoAttack = round.attackSelections.find(
      selection => selection.playerId === playerTwo.id,
    );

    const playerOneBlock = round.blockSelections.find(
      selection => selection.playerId === playerOne.id,
    );
    const playerTwoBlock = round.blockSelections.find(
      selection => selection.playerId === playerTwo.id,
    );

    if (
      playerOneAttack &&
      playerTwoAttack &&
      playerOneBlock &&
      playerTwoBlock
    ) {
      const roundOutcome = calculateRoundOutcome({
        heroId: parsedMessage.heroId,
        room,
        isPvp: room.isPvp,
        selected: {
          attackZone: playerOneAttack.attackZone,
          blockZone: parsedMessage.selected.blockZone,
          attackTime: playerOneAttack.attackTime,
          blockTime: parsedMessage.selected.blockTime,
          opponentAttackZone: playerTwoAttack.attackZone,
          opponentBlockZone: playerTwoBlock.blockZone,
          opponentAttackTime: playerTwoAttack.attackTime,
          opponentBlockTime: playerTwoBlock.blockTime,
        },
      });

      room.rounds.unshift(roundOutcome);

      console.log("Round results:", roundOutcome.results);

      playerOne.hp = roundOutcome.results.find(
        res => res.playerId === playerOne.id,
      )?.hp!;
      playerTwo.hp = roundOutcome.results.find(
        res => res.playerId === playerTwo.id,
      )?.hp!;

      const hasMatchFinished = playerOne.hp <= 0 || playerTwo.hp <= 0;

      //TODO: try to write a separate PvP logic for the bottom AND then combine what's possible
      if (!room.isPvp) {
        if (hasMatchFinished) {
          //Match has finished. Calc result and send to both players
          const socketHeroOne = activeHeroesCache.get(playerOne.id);

          if (socketHeroOne) {
            console.log(
              "MATCH_FINISHED_FINISHED...",
              socketHeroOne.currHp,
              playerOne.hp,
            );
            socketHeroOne.currHp = playerOne.hp;
          }

          room.status = "finished";

          console.log(
            "MATCH_FINISHED_PVE...",
            socketHeroOne?.currHp,
            playerOne.hp,
          );

          await getMatchResults({
            room,
            player: playerOne,
            bot: playerTwo,
            socketHeroOne,
          });
        } else {
          room.currentRound++;
        }

        //Notify Only real player of the Round result
        ws.send(
          JSON.stringify({
            type: "personal_room_update",
            data: room,
          }),
        );
      }
    } else {
      ws.send(
        JSON.stringify({
          type: "error",
          message:
            "Something is wrong with the round data, cannot calculate outcome",
        }),
      );
      return;
    }
  }
};
