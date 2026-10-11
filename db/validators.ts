import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { bots } from "@/db/schema"

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
