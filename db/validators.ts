import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { bots, chats } from "@/db/schema"

export const insertBotSchema = createInsertSchema(bots, {
  avatar: z.string().trim().min(1, "Choose a face for your bot."),
  name: z
    .string()
    .trim()
    .min(1, "Enter a name for your bot.")
    .max(80, "Bot names must be 80 characters or fewer."),
  job: z
    .string()
    .trim()
    .min(1, "Enter a job for your bot.")
    .max(120, "Bot jobs must be 120 characters or fewer."),
  instructions: z
    .string()
    .max(4000, "Instructions must be 4000 characters or fewer."),
}).omit({
  id: true,
  userId: true,
  sandboxId: true,
  createdAt: true,
})

export type InsertBot = z.infer<typeof insertBotSchema>

export const insertGroupChatSchema = createInsertSchema(chats, {
  name: z
    .string()
    .trim()
    .min(1, "Enter a name for your group chat.")
    .max(80, "Group chat names must be 80 characters or fewer."),
})
  .pick({ name: true })
  .extend({
    botIds: z
      .array(z.string().trim().min(1))
      .min(2, "Choose at least two bots.")
      .refine((botIds) => new Set(botIds).size === botIds.length, {
        message: "Each bot can only be added once.",
      }),
  })

export type InsertGroupChat = z.infer<typeof insertGroupChatSchema>
