import { expMap } from "../../constants/expMap";
import {
  deleteCopiedBot,
  updateHeroAfterFight,
  updateHeroCurrHp,
} from "../../drizzle/queries/hero";
import { calculateRoundOutcome } from "../../helpers/calculateDamageHelper";
import { calculateRestTime } from "../../helpers/calculateRestTime";
import { calculateExp } from "../../helpers/calculateExpHelper";
import { calculateSouls } from "../../helpers/calculateSoulsHelper";
import { calculateShards } from "../../helpers/calculateShardsHelper";
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
        //Then assign the attackTime & blockTime to actions[] for each player
        //Maybe upd the actionedPlayers object in the room and make sure to reset it to false once a round is complete OR
        //OR move these values to the rounds instead of the topLevel of the room

        const existingRound = room.rounds?.find(
          val => val.roundNumber === room.currentRound,
        );
        if (room.matchResult) {
          console.log("This match is finished");
        } else {
          if (room.isPvp) {
            //PvP fight for 2 human players
            if (existingRound) {
              //Update existing round while keeping old values
              const playerTwoActions = {
                playerId: parsedMessage.heroId,
                attackTime: parsedMessage.selected.attack,
                attackArea: currUser?.stats.attackArea,
                blockTime: parsedMessage.selected.block,
                blockArea: currUser?.stats.blockArea,
              };

              existingRound.actions.push(playerTwoActions);
              existingRound.actionedPlayers.push({
                id: parsedMessage.heroId,
                madeSelection: true,
              });
              console.log("Second_Player_action_commited", existingRound);

              if (existingRound.actionedPlayers.length === 2) {
                console.log("BOTH_ACTIONS_RECORDED");
                const playerOne = room.players[0];
                const playerTwo = room.players[1];
                //Calculate outcomes and send to both players
                const roundOutcome = calculateRoundOutcome(
                  {
                    attackTime: existingRound.actions[0].attackTime,
                    blockTime: existingRound.actions[0].blockTime,
                    maxHp: playerOne.maxHp,
                    hp: playerOne.hp,
                    ...playerOne.stats,
                  },
                  {
                    attackTime: existingRound.actions[1].attackTime,
                    blockTime: existingRound.actions[1].blockTime,
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
                actions: [
                  {
                    playerId: parsedMessage.heroId,
                    attackTime: parsedMessage.selected.attack,
                    attackArea: currUser?.stats.attackArea,
                    blockTime: parsedMessage.selected.block,
                    blockArea: currUser?.stats.blockArea,
                  },
                ],
                actionedPlayers: [
                  { id: parsedMessage.heroId, madeSelection: true },
                ],
                results: [],
              };

              room.rounds.unshift(newRound);
              console.log("First_Player_action_commited", room.rounds);

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

            const botAttackTime = Math.floor(Math.random() * 200); //TODO: improve bot logic
            const botBlockTime = Math.floor(Math.random() * 200); //TODO: improve bot logic

            //Calculate outcomes and send to both players
            const roundOutcome = calculateRoundOutcome(
              {
                attackTime: parsedMessage.selected.attack,
                blockTime: parsedMessage.selected.block,
                maxHp: player.maxHp,
                hp: player.hp,
                ...player.stats,
              },
              {
                attackTime: botAttackTime,
                blockTime: botBlockTime,
                maxHp: bot.maxHp,
                hp: bot.hp,
                ...bot.stats,
              },
            );

            const newRound: Round = {
              roundNumber: room.currentRound,
              actions: [
                {
                  playerId: parsedMessage.heroId,
                  attackTime: parsedMessage.selected.attack,
                  attackArea: currUser?.stats.attackArea,
                  blockTime: parsedMessage.selected.block,
                  blockArea: currUser?.stats.blockArea,
                },
                {
                  playerId: bot.id,
                  attackTime: Math.floor(Math.random() * 200), //TODO: improve bot logic
                  attackArea: bot?.stats.attackArea,
                  blockTime: Math.floor(Math.random() * 200), //TODO: improve bot logic
                  blockArea: bot?.stats.blockArea,
                },
              ],
              actionedPlayers: [
                { id: parsedMessage.heroId, madeSelection: true },
                { id: bot.id, madeSelection: true },
              ],
              results: [
                { playerId: player.id, ...roundOutcome.playerOne },
                { playerId: bot.id, ...roundOutcome.playerTwo },
              ],
            };

            room.rounds.unshift(newRound);

            console.log("PvE results:", newRound.results);

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

              const isResulDraw = player.hp <= 0 && bot.hp <= 0;
              const winnerId = player.hp <= 0 ? bot.id : player.id;

              await updateHeroCurrHp({
                heroId: player.id,
                currHp: player.hp,
              });

              // await updateHeroCurrHp({
              //   heroId: bot.id,
              //   currHp: bot.hp,
              // });

              if (isResulDraw) {
                //it is a draw
                //TODO: Update this logic to not give any exp if draw
                room.matchResult = {
                  isDraw: true,
                  exp: 0,
                };

                await updateHeroCurrHp({
                  heroId: player.id,
                  currHp: player.hp,
                });
              } else {
                console.log("WE_HAVE_A_WINNER...");
                //we have a winner
                const isPlayerWinner = winnerId === player.id;
                const expAwarded = calculateExp(isPlayerWinner, room.isDungeon);
                const soulsAwarded = calculateSouls(
                  isPlayerWinner,
                  player.lvl,
                  bot.lvl,
                  room.isDungeon,
                );
                const shardsAwarded =
                  room.isDungeon && room.shardsType
                    ? calculateShards(isPlayerWinner, room.shardsType)
                    : { a: 0, b: 0, c: 0 };

                console.log("RESULT_EXP", expAwarded, room.isDungeon);
                console.log("RESULT_SOULS", soulsAwarded);
                console.log("RESULT_SHARDS", shardsAwarded);
                const isLvlUp =
                  player.exp + expAwarded >= expMap[player.lvl + 1];

                await updateHeroAfterFight({
                  heroId: player.id,
                  exp: player.exp + expAwarded,
                  lvl: isLvlUp ? player.lvl + 1 : player.lvl,
                  statsPoints: isLvlUp
                    ? player.statsPoints + 5
                    : player.statsPoints,
                  souls: player.souls + soulsAwarded,
                  shards: {
                    a: player.shardsA + shardsAwarded.a,
                    b: player.shardsB + shardsAwarded.b,
                    c: player.shardsC + shardsAwarded.c,
                  },
                });

                //TODO: should update Hero's Lvl in activeHeroesCache if there is a level up

                isLvlUp && socketHeroOne!.lvl++;

                console.log("DELETING_BOT...", bot);

                await deleteCopiedBot(bot.id);

                room.matchResult = {
                  isDraw: false,
                  winnerId: winnerId,
                  winnerName: room.players.find(
                    player => player.id === winnerId,
                  )?.name,
                  exp: expAwarded,
                  souls: soulsAwarded,
                  shardsA: shardsAwarded.a,
                  shardsB: shardsAwarded.b,
                  shardsC: shardsAwarded.c,
                };
              }
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
      );
    }
  } else {
    console.log(
      "User with heroId %s has no active fightRooms",
      parsedMessage.heroId,
    );
  }
};
