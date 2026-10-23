import { nanoid } from "nanoid";
import { relations } from "drizzle-orm";
import {
  index,
  bigint,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const chatKind = pgEnum("chat_kind", ["direct", "group"]);

export const bots = pgTable(
  "bots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar")
      .notNull()
      .$defaultFn(() => nanoid()),
    job: text("job").notNull(),
    instructions: text("instructions"),
    sandboxId: text("sandbox_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("bots_user_id_idx").on(table.userId)],
);

export const chats = pgTable(
  "chats",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id").notNull(),
    kind: chatKind("kind").notNull().default("direct"),
    name: text("name"),
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("chats_user_id_idx").on(table.userId)],
);

export const chatMembers = pgTable(
  "chat_members",
  {
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    botId: text("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.chatId, table.botId] }),
    index("chat_members_bot_id_idx").on(table.botId),
  ],
);

export const googleApiRateLimits = pgTable("google_api_rate_limits", {
  provider: text("provider").primaryKey(),
  nextAvailableAt: timestamp("next_available_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usagePeriods = pgTable(
  "usage_periods",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id").notNull(),
    subscriptionItemId: text("subscription_item_id").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    sandboxSeconds: bigint("sandbox_seconds", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("usage_periods_user_subscription_period_idx").on(
      table.userId,
      table.subscriptionItemId,
      table.periodStart,
    ),
    index("usage_periods_user_id_idx").on(table.userId),
  ],
);

export const usageLedgerEntries = pgTable(
  "usage_ledger_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    periodId: text("period_id")
      .notNull()
      .references(() => usagePeriods.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    resource: text("resource", {
      enum: ["input_tokens", "output_tokens", "sandbox_seconds"],
    }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    eventKey: text("event_key").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("usage_ledger_entries_period_id_idx").on(table.periodId)],
);

export const botsRelations = relations(bots, ({ many }) => ({
  chatMembers: many(chatMembers),
}));

export const chatsRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMembers.chatId],
    references: [chats.id],
  }),
  bot: one(bots, {
    fields: [chatMembers.botId],
    references: [bots.id],
  }),
}));
