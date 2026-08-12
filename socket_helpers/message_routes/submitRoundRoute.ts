import { updateHeroCurrHp } from "../../drizzle/queries/hero";
import { calcRoundResults } from "../../helpers/calculateDamageHelper";
import { calculateRestTime } from "../../helpers/calculateRestTime";
import { getMatchResults } from "../../helpers/getMatchResults";
import type { Round } from "../../types/roomType";
import {
  activeHeroesCache,
  fightRoomsCache,
  userRoomsCache,
} from "../socketCache";

export const submitRoundRoute = async (
  server: Bun.Server,
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
  parsedMessage: {
    heroId: string;
    selected: {
      attack: number;
      block: number;
    };
    attackTime?: number;
    blockTime?: number;
  },
) => {
  /* TODO:
    1) get the user AND the room
    2) check avaialable round AND if no round in progress ==> create new round
    3) calculate 1st player's attack & block position including player stats
    4) await second player's picks
    5) calculare 2nd player's attack & block position including player stats
    6) calculate damage dealt and hp left for each player
    7) return roudn outcome including damage, isCrit etc. and hp left to both players
  **/
  const activePlayerRoomId = userRoomsCache.get(parsedMessage.heroId)?.id;
  if (activePlayerRoomId) {
    //HeroId has associated active fightRoom
    try {
      //Check whetehr room exist the heroId is matching
      const room = fightRoomsCache.get(activePlayerRoomId);
      const currUser = room?.players?.find(
        val => val.id === parsedMessage.heroId,
      );
      if (room && currUser) {
        //User and Room exist and match

        //save attack & block picks into Round [i]
        //We need to check the current roundNumber AND create the roudn with that number if it doesn't exist
        //Then assign the block selection to the current round

        const existingRound = room.rounds?.find(
          val => val.roundNumber === room.currentRound,
        );
        if (room.matchResult) {
          console.log("This match is finished");
        } else {
          if (room.isPvp) {
            //PvP fight for 2 human players
            if (existingRound) {
              const blockSelection = {
                playerId: parsedMessage.heroId,
                blockZone: parsedMessage.selected.block,
                blockTime: parsedMessage.blockTime ?? 0,
              };

              existingRound.blockSelections.push(blockSelection);

              if (existingRound.blockSelections.length === 2) {
                console.log("BOTH_ACTIONS_RECORDED");
                const playerOne = room.players[0];
                const playerTwo = room.players[1];
                const playerOneAttack = existingRound.attackSelections.find(
                  selection => selection.playerId === playerOne.id,
                )!;
                const playerTwoAttack = existingRound.attackSelections.find(
                  selection => selection.playerId === playerTwo.id,
                )!;
                const playerOneBlock = existingRound.blockSelections.find(
                  selection => selection.playerId === playerOne.id,
                )!;
                const playerTwoBlock = existingRound.blockSelections.find(
                  selection => selection.playerId === playerTwo.id,
                )!;
                //Calculate outcomes and send to both players
                const roundOutcome = calcRoundResults(
                  {
                    attackZone: playerOneAttack.attackZone,
                    attackTime: playerOneAttack.attackTime,
                    blockZone: playerOneBlock.blockZone,
                    blockTime: playerOneBlock.blockTime,
                    maxHp: playerOne.maxHp,
                    hp: playerOne.hp,
                    ...playerOne.stats,
                  },
                  {
                    attackZone: playerTwoAttack.attackZone,
                    attackTime: playerTwoAttack.attackTime,
                    blockZone: playerTwoBlock.blockZone,
                    blockTime: playerTwoBlock.blockTime,
                    maxHp: playerTwo.maxHp,
                    hp: playerTwo.hp,
                    ...playerTwo.stats,
                  },
                );

                existingRound.results.push(
                  { playerId: playerOne.id, ...roundOutcome.playerOne },
                  { playerId: playerTwo.id, ...roundOutcome.playerTwo },
                );

                //1. check values pushed
                //2. send relevant info to each player participating in this fight

                console.log("PvP Results:", existingRound.results);

                playerOne.hp = existingRound.results.find(
                  res => res.playerId === playerOne.id,
                )?.hp!;
                playerTwo.hp = existingRound.results.find(
                  res => res.playerId === playerTwo.id,
                )?.hp!;

                const hasMatchFinished = playerOne.hp <= 0 || playerTwo.hp <= 0;

                if (hasMatchFinished) {
                  //Match has finished. Calc result and send to both players
                  const socketHeroOne = activeHeroesCache.get(playerOne.id);
                  const socketHeroTwo = activeHeroesCache.get(playerTwo.id);
                  if (socketHeroOne && socketHeroTwo) {
                    socketHeroOne.currHp = playerOne.hp;
                    socketHeroTwo.currHp = playerTwo.hp;
                  }
                  room.status = "finished";
                  await updateHeroCurrHp({
                    heroId: playerOne.id,
                    currHp: playerOne.hp,
                  });
                  await updateHeroCurrHp({
                    heroId: playerTwo.id,
                    currHp: playerTwo.hp,
                  });

                  if (playerOne.hp <= 0 && playerTwo.hp <= 0) {
                    //it is a draw
                    room.matchResult = {
                      isDraw: true,
                      exp: 0,
                    };
                  } else {
                    //we have a winner
                    const winnerId =
                      playerOne.hp <= 0 ? playerTwo.id : playerOne.id;

                    //TODO: revisit PvP exp award logic later on. Might need to remove exp award for PvP fights
                    // const isCurrentPlayerWinner =
                    //   winnerId === parsedMessage.heroId;
                    // const expAwarded = calculateExp(
                    //   isCurrentPlayerWinner,
                    //   ws.data.isDungeon,
                    // );

                    room.matchResult = {
                      isDraw: false,
                      winnerId: winnerId,
                      winnerName: room.players.find(
                        player => player.id === winnerId,
                      )?.name,
                      exp: 0,
                    };
                  }
                }
                //create newRound
                if (!hasMatchFinished) room.currentRound++;

                //Notify both players of the Roudn result
                server.publish(
                  room.id,
                  JSON.stringify({
                    type: "personal_room_update",
                    data: room,
                  }),
                );
              }
            } else {
              //Create and set a completely new round
              const newRound: Round = {
                roundNumber: room.currentRound,
                attackSelections: [
                  {
                    playerId: parsedMessage.heroId,
                    attackZone: parsedMessage.selected.attack,
                    attackTime: parsedMessage.attackTime ?? 0,
                  },
                ],
                blockSelections: [
                  {
                    playerId: parsedMessage.heroId,
                    blockZone: parsedMessage.selected.block,
                    blockTime: parsedMessage.blockTime ?? 0,
                  },
                ],
                results: [],
              };

              room.rounds.unshift(newRound);
              // console.log("First_Player_action_commited", room.rounds);

              server.publish(
                room.id,
                JSON.stringify({
                  type: "personal_room_update",
                  data: room,
                }),
              );
            }
          } else {
            //PvE fight against a bot
            //Each round is created once player makes a selection
            //Should include random attack & block times for the bot on Round creation

            const player = room.players[0];
            const bot = room?.players[1];

            const playerAttack = existingRound?.attackSelections.find(
              selection => selection.playerId === player.id,
            );
            const botAttack = existingRound?.attackSelections.find(
              selection => selection.playerId === bot.id,
            );
            const botBlockZone = Math.floor(Math.random() * 4) + 1; //TODO: improve bot logic
            const botBlockTime = Math.floor(Math.random() * 5001);

            //Calculate outcomes and send to both players
            const roundOutcome = calcRoundResults(
              {
                attackZone:
                  playerAttack?.attackZone ?? parsedMessage.selected.attack,
                attackTime:
                  playerAttack?.attackTime ?? parsedMessage.attackTime ?? 0,
                blockZone: parsedMessage.selected.block,
                blockTime: parsedMessage.blockTime ?? 0,
                maxHp: player.maxHp,
                hp: player.hp,
                ...player.stats,
              },
              {
                attackZone: botAttack!.attackZone,
                attackTime: botAttack!.attackTime,
                blockZone: botBlockZone,
                blockTime: botBlockTime,
                maxHp: bot.maxHp,
                hp: bot.hp,
                ...bot.stats,
              },
            );

            const newRound: Round = {
              roundNumber: room.currentRound,
              attackSelections: existingRound?.attackSelections ?? [],
              blockSelections: [
                {
                  playerId: parsedMessage.heroId,
                  blockZone: parsedMessage.selected.block,
                  blockTime: parsedMessage.blockTime ?? 0,
                },
                {
                  playerId: bot.id,
                  blockZone: botBlockZone,
                  blockTime: botBlockTime,
                },
              ],
              results: [
                { playerId: player.id, ...roundOutcome.playerOne },
                { playerId: bot.id, ...roundOutcome.playerTwo },
              ],
            };

            if (existingRound) {
              Object.assign(existingRound, newRound);
            } else {
              room.rounds.unshift(newRound);
            }

            // console.log("PvE results:", newRound.results);

            player.hp = newRound.results.find(
              res => res.playerId === player.id,
            )?.hp!;
            bot.hp = newRound.results.find(res => res.playerId === bot.id)?.hp!;

            const hasMatchFinished = player.hp <= 0 || bot.hp <= 0;

            if (hasMatchFinished) {
              //Match has finished. Calc result and send to both players
              const socketHeroOne = activeHeroesCache.get(player.id);

              if (socketHeroOne) {
                console.log(
                  "MATCH_FINISHED_FINISHED...",
                  socketHeroOne.currHp,
                  player.hp,
                );
                socketHeroOne.currHp = player.hp;
              }

              room.status = "finished";

              console.log(
                "MATCH_FINISHED_PVE...",
                socketHeroOne?.currHp,
                player.hp,
              );

              await getMatchResults({ room, player, bot, socketHeroOne });
            }
            //create newRound
            if (!hasMatchFinished) room.currentRound++;

            //Notify Only real player of the Round result
            ws.send(
              JSON.stringify({
                type: "personal_room_update",
                data: room,
              }),
            );
          }
        }
      } else {
        console.log(
          "room with roomId %s and hero with heroId %s don't match",
          activePlayerRoomId,
          parsedMessage.heroId,
        );
      }
    } catch (err) {
      console.log(
        "ERROR: submirRoundRoute for heroId ==> %s and roomId ==> %s ",
        parsedMessage.heroId,
        activePlayerRoomId,
        err,
      );
    }
  } else {
    console.log(
      "User with heroId %s has no active fightRooms",
      parsedMessage.heroId,
    );
  }
};
