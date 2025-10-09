import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  varchar,
} from "drizzle-orm/pg-core";
import { heroSxma } from "./hero";

export const fightRoomSxma = pgTable("fight_room", {
  roomId: varchar("room_id").primaryKey().unique().notNull(),
  playerOneCalcStats: jsonb("player1_stats"), // to be calculated on room creation OR on fight initiation
  playerTwoCalcStats: jsonb("player2_stats"), // to be calculated on room creation OR on fight initiation
  playerOne: varchar("player_one")
    .references(() => heroSxma.id, {
      onDelete: "cascade",
    })
    .notNull(),
  playerTwo: varchar("player_two").references(() => heroSxma.id, {
    onDelete: "cascade",
  }),
  history: jsonb("history").default([]),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  isFinished: boolean("is_finished").default(false),
  isPvp: boolean("is_pvp").default(true),
});

export const fightRoomRelations = relations(fightRoomSxma, ({ one }) => ({
  playerOne: one(heroSxma, {
    fields: [fightRoomSxma.playerOne],
    references: [heroSxma.id],
  }),
  playerTwo: one(heroSxma, {
    fields: [fightRoomSxma.playerTwo],
    references: [heroSxma.id],
  }),
}));

export type SelectFightRoom = typeof fightRoomSxma.$inferSelect;
export type InsertFightRoom = typeof fightRoomSxma.$inferInsert;
