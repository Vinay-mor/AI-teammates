"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { z } from "zod"

import { createGroupChat } from "@/action/group-chat"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { insertGroupChatSchema } from "@/db/validators"

type BotOption = { id: string; name: string; avatar: string }
type GroupChatFormValues = z.infer<typeof insertGroupChatSchema>

export function GroupChatDialog({
  bots,
  open,
  onOpenChange,
}: {
  bots: BotOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const form = useForm<GroupChatFormValues>({
    resolver: zodResolver(insertGroupChatSchema),
    defaultValues: { name: "", botIds: [] },
  })

  useEffect(() => {
    if (open) {
      form.reset({ name: "", botIds: [] })
    } else {
      form.clearErrors()
    }
  }, [open, form])

  async function onSubmit(values: GroupChatFormValues) {
    const result = await createGroupChat(values)
    if (!result.success) {
      form.setError("root.server", { message: result.error })
      return
    }

    toast.add({
      title: "Group chat created",
      description: `${values.name} is ready to chat.`,
      type: "success",
    })
    onOpenChange(false)
    router.push(`/chats/${result.id}`)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark max-h-[calc(100svh-2rem)] max-w-[48rem] gap-0 overflow-hidden rounded-[1.25rem] border border-border bg-popover p-0 text-base shadow-2xl sm:max-w-[48rem]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="max-h-[calc(100svh-10rem)] overflow-y-auto px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
            <DialogHeader className="gap-2 text-left">
              <DialogTitle className="text-2xl leading-tight font-medium">
                New group chat
              </DialogTitle>
              <DialogDescription className="text-lg leading-7">
                Name the group and pick which bots are in it.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="mt-6 gap-5">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name} className="text-base">
                      Name
                    </FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      placeholder="Weekend plans"
                      className="h-12 rounded-2xl px-4 text-base"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="botIds"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-base">Bots</FieldLabel>
                    {bots.length ? (
                      <div className="flex flex-col gap-1">
                        {bots.map((bot) => {
                          const checked = field.value.includes(bot.id)
                          return (
                            <label
                              key={bot.id}
                              className="flex min-h-14 cursor-pointer items-center gap-4 rounded-xl px-1 hover:bg-muted/60"
                            >
                              <Checkbox
                                checked={checked}
                                aria-invalid={fieldState.invalid}
                                onCheckedChange={(nextChecked) => {
                                  const next = nextChecked
                                    ? [...field.value, bot.id]
                                    : field.value.filter((id) => id !== bot.id)
                                  field.onChange(next)
                                }}
                              />
                              <ChatAvatar
                                seed={bot.avatar}
                                className="size-8"
                              />
                              <span className="text-base">{bot.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
                        Create a bot before starting a group chat.
                      </p>
                    )}
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            {form.formState.errors.root?.server && (
              <FieldError className="mt-4">
                {form.formState.errors.root.server.message}
              </FieldError>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-muted/30 px-6 py-5 sm:px-7">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={form.formState.isSubmitting || bots.length < 2}
            >
              {form.formState.isSubmitting && (
                <Spinner data-icon="inline-start" />
              )}
              Create group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
