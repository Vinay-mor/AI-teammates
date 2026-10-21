"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { Trash2Icon } from "lucide-react"
import { z } from "zod"

import {
  createGroupChat,
  deleteGroupChat,
  updateGroupChat,
} from "@/action/group-chat"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  group,
  open,
  onOpenChange,
}: {
  bots: BotOption[]
  group?: { id: string; name: string; botIds: string[] }
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const form = useForm<GroupChatFormValues>({
    resolver: zodResolver(insertGroupChatSchema),
    defaultValues: { name: "", botIds: [] },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        group
          ? { name: group.name, botIds: group.botIds }
          : { name: "", botIds: [] },
      )
    } else {
      form.clearErrors()
    }
  }, [open, group, form])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.clearErrors()
      setDeleteConfirmOpen(false)
      setDeleteError(null)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(values: GroupChatFormValues) {
    const result = group
      ? await updateGroupChat(group.id, values)
      : await createGroupChat(values)
    if (!result.success) {
      form.setError("root.server", { message: result.error })
      return
    }

    toast.add({
      title: group ? "Group chat updated" : "Group chat created",
      description: group
        ? `${values.name}'s details have been saved.`
        : `${values.name} is ready to chat.`,
      type: "success",
    })
    handleOpenChange(false)
    if (!group && "id" in result) router.push(`/chats/${result.id}`)
    router.refresh()
  }

  async function onDeleteGroup() {
    if (!group) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const result = await deleteGroupChat(group.id)
      if (!result.success) {
        setDeleteError(result.error)
        setIsDeleting(false)
        return
      }
    } catch {
      setDeleteError("We couldn't delete the group chat. Please try again.")
      setIsDeleting(false)
      return
    }

    setIsDeleting(false)
    toast.add({
      title: "Group chat deleted",
      description: `${group.name} has been deleted.`,
      type: "success",
    })
    setDeleteConfirmOpen(false)
    handleOpenChange(false)
    router.push("/")
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="dark max-h-[calc(100svh-2rem)] max-w-[48rem] gap-0 overflow-hidden rounded-[1.25rem] border border-border bg-popover p-0 text-base shadow-2xl sm:max-w-[48rem]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="max-h-[calc(100svh-10rem)] overflow-y-auto px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
            <DialogHeader className="gap-2 text-left">
              <DialogTitle className="text-2xl leading-tight font-medium">
                {group ? "Edit group chat" : "New group chat"}
              </DialogTitle>
              <DialogDescription className="text-lg leading-7">
                {group
                  ? "Change the name or update which bots are in the group."
                  : "Name the group and pick which bots are in it."}
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
            {group && (
              <AlertDialog
                open={deleteConfirmOpen}
                onOpenChange={(nextOpen) => {
                  setDeleteConfirmOpen(nextOpen)
                  if (!nextOpen) setDeleteError(null)
                }}
              >
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="destructive"
                      size="lg"
                      disabled={isDeleting || form.formState.isSubmitting}
                      className="mr-auto"
                    />
                  }
                >
                  <Trash2Icon data-icon="inline-start" />
                  Delete group
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {group.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the group chat. You cannot undo
                      this action.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError && (
                    <p role="alert" className="text-sm text-destructive">
                      {deleteError}
                    </p>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      variant="destructive"
                      disabled={isDeleting}
                      onClick={onDeleteGroup}
                    >
                      {isDeleting && <Spinner data-icon="inline-start" />}
                      Delete group
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => handleOpenChange(false)}
              disabled={isDeleting || form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={
                isDeleting || form.formState.isSubmitting || bots.length < 2
              }
            >
              {form.formState.isSubmitting && (
                <Spinner data-icon="inline-start" />
              )}
              {group ? "Save changes" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
