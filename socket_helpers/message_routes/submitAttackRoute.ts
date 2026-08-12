import { fightRoomsCache, userRoomsCache } from "../socketCache";

export const submitAttackRoute = (
  server: Bun.Server,
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
  parsedMessage: {
    heroId: string;
    selected: {
      attackZone: number;
      attackTime: number;
    };
  },
) => {
  const activePlayerRoomId = userRoomsCache.get(parsedMessage.heroId)?.id;
  const room = activePlayerRoomId
    ? fightRoomsCache.get(activePlayerRoomId)
    : undefined;
  const isRoomPlayer = room?.players.some(
    player => player.id === parsedMessage.heroId,
  );

  if (!room || !isRoomPlayer || room.matchResult) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Cannot submit attack for this fight room",
      }),
    );
    return;
  }

  let round = room.rounds.find(
    existingRound => existingRound.roundNumber === room.currentRound,
  );

  if (!round) {
    round = {
      roundNumber: room.currentRound,
      attackSelections: [],
      blockSelections: [],
      results: [],
    };
    room.rounds.unshift(round);
  }

  if (
    round.attackSelections.some(
      selection => selection.playerId === parsedMessage.heroId,
    )
  ) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Attack already submitted for this round",
      }),
    );
    return;
  }

  round.attackSelections.push({
    playerId: parsedMessage.heroId,
    attackZone: parsedMessage.selected.attackZone,
    attackTime: parsedMessage.selected.attackTime,
  });

  if (!room.isPvp) {
    const bot = room.players.find(player => player.id !== parsedMessage.heroId);

    if (
      bot &&
      !round.attackSelections.some(selection => selection.playerId === bot.id)
    ) {
      round.attackSelections.push({
        playerId: bot.id,
        attackZone: Math.floor(Math.random() * 4) + 1,
        attackTime: Math.floor(Math.random() * 5001),
      });
    }
  }

  const requiredPlayerIds = room.players.map(player => player.id);

  const selectedPlayerIds = requiredPlayerIds.filter(playerId =>
    round.attackSelections.some(selection => selection.playerId === playerId),
  );

  const haveAllPlayersSelected =
    selectedPlayerIds.length === requiredPlayerIds.length;

  server.publish(
    room.id,
    JSON.stringify(
      haveAllPlayersSelected
        ? {
            type: "personal_room_update",
            data: room,
          }
        : {
            type: "attack_selection_update",
            data: {
              roundNumber: round.roundNumber,
              selectedPlayerIds,
            },
          },
    ),
  );
};
