"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { nanoid } from "nanoid"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { ShuffleIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"

import { createBot, deleteBot, updateBot } from "@/action/bot"
import { showUpgradeToast } from "@/components/billing-toast"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { insertBotSchema } from "@/db/validators"

const suggestedJobs = [
  "Research assistant",
  "Code reviewer",
  "Writing editor",
  "Tutor",
]

const botNames = ["Ada", "Mira", "Nova", "Riley", "Sage", "Theo"]

const jobInstructions: Record<string, string> = {
  "Research assistant":
    "Research questions thoroughly, summarize findings clearly, cite reliable sources, and flag uncertainty.",
  "Code reviewer":
    "Review code for bugs, security issues, and maintainability. Prioritize actionable findings with file and line references.",
  "Writing editor":
    "Improve clarity, flow, grammar, and tone while preserving the author's meaning. Explain significant edits briefly.",
  Tutor:
    "Explain concepts step by step, adapt to my level, ask guiding questions, and check my understanding.",
}

function getRandomBotName() {
  return botNames[Math.floor(Math.random() * botNames.length)]
}

const botFormSchema = insertBotSchema

type BotFormValues = z.infer<typeof botFormSchema>
type EditableBot = {
  id: string
  avatar: string
  name: string
  job: string
  instructions: string | null
}

function BotDialog({
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  bot,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  bot?: EditableBot
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const open = openProp ?? internalOpen
  const [avatar, setAvatar] = useState(() => bot?.avatar ?? nanoid())
  const wasOpenRef = useRef(false)
  const router = useRouter()
  const { has, isLoaded } = useAuth()
  const form = useForm<BotFormValues>({
    resolver: zodResolver(botFormSchema),
    defaultValues: {
      avatar,
      name: "",
      job: "",
      instructions: "",
    },
  })

  useEffect(() => {
    if (openProp && !wasOpenRef.current && bot) {
      form.reset({
        avatar: bot.avatar,
        name: bot.name,
        job: bot.job,
        instructions: bot.instructions ?? "",
      })
    }
    wasOpenRef.current = Boolean(openProp)
  }, [openProp, bot, form])

  function getInitialValues(): BotFormValues {
    if (bot) {
      return {
        avatar: bot.avatar,
        name: bot.name,
        job: bot.job,
        instructions: bot.instructions ?? "",
      }
    }

    return {
      avatar,
      name: getRandomBotName(),
      job: "",
      instructions: "",
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (openProp === undefined) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (nextOpen && !open) {
      form.reset(getInitialValues())
    } else if (!nextOpen) {
      form.clearErrors()
      form.reset({ avatar, name: "", job: "", instructions: "" })
    }
  }

  function handleCreateClick() {
    if (!isLoaded) return

    if (!has?.({ plan: "pro" })) {
      showUpgradeToast(
        "Upgrade to Pro to create bots and their sandboxes.",
        () => router.push("/pricing"),
      )
      return
    }

    handleOpenChange(true)
  }

  async function onSubmit(values: BotFormValues) {
    const result = bot
      ? await updateBot(bot.id, values)
      : await createBot(values)

    if (!result.success) {
      if (result.upgradeRequired) {
        showUpgradeToast(result.error, () => router.push("/pricing"))
        return
      }
      form.setError("root.server", { message: result.error })
      return
    }

    toast.add({
      title: bot ? "Bot updated" : "Bot created",
      description: bot
        ? `${values.name}'s details have been saved.`
        : `${values.name} is ready to work.`,
      type: "success",
    })
    handleOpenChange(false)
    if (!bot) router.push("/")
    router.refresh()
  }

  async function onDeleteBot() {
    if (!bot) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const result = await deleteBot(bot.id)
      if (!result.success) {
        setDeleteError(result.error)
        setIsDeleting(false)
        return
      }
    } catch {
      setDeleteError("We couldn't delete your bot. Please try again.")
      setIsDeleting(false)
      return
    }

    setIsDeleting(false)

    toast.add({
      title: "Bot deleted",
      description: `${bot.name} and its direct chats have been deleted.`,
      type: "success",
    })
    setDeleteConfirmOpen(false)
    handleOpenChange(false)
    router.push("/")
    router.refresh()
  }

  function shuffleAvatar() {
    const nextAvatar = nanoid()
    setAvatar(nextAvatar)
    form.setValue("avatar", nextAvatar, { shouldValidate: true })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="h-11 rounded-xl px-4 text-base"
          onClick={bot ? () => handleOpenChange(true) : handleCreateClick}
        >
          Create a new bot
        </Button>
      )}
      <DialogContent className="dark max-h-[calc(100svh-2rem)] max-w-[52rem] gap-0 overflow-y-auto rounded-[1.25rem] border border-border bg-popover p-0 text-base shadow-2xl sm:max-w-[52rem]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6 px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
            <DialogHeader className="gap-2 text-left">
              <DialogTitle className="text-2xl leading-tight font-medium">
                {bot ? "Update bot" : "New bot"}
              </DialogTitle>
              <DialogDescription className="text-lg leading-7">
                {bot
                  ? "Update its face, name, and how it works."
                  : "Give it a face, a name, and a job to do."}
              </DialogDescription>
            </DialogHeader>

            <ToggleGroup
              value={form.watch("job") ? [form.watch("job")] : []}
              onValueChange={(value) => {
                if (value[0]) {
                  form.setValue("job", value[0], {
                    shouldDirty: true,
                    shouldValidate: form.formState.isSubmitted,
                  })
                  form.setValue("instructions", jobInstructions[value[0]], {
                    shouldDirty: true,
                    shouldValidate: form.formState.isSubmitted,
                  })
                }
              }}
              aria-label="Suggested bot jobs"
              variant="outline"
              spacing={2}
              className="flex-wrap justify-start"
            >
              {suggestedJobs.map((job) => (
                <ToggleGroupItem
                  key={job}
                  value={job}
                  className="h-10 rounded-full px-4 text-base"
                >
                  {job}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <ChatAvatar seed={avatar} className="size-14 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">Face</p>
                  <p className="text-muted-foreground">
                    Shuffle until you find one you like.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={shuffleAvatar}
              >
                <ShuffleIcon data-icon="inline-start" />
                Shuffle
              </Button>
            </div>

            <FieldGroup className="gap-5">
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
                      placeholder="Ada"
                      className="h-12 rounded-2xl px-4 text-base"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="job"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name} className="text-base">
                      Job
                    </FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      placeholder="Research assistant"
                      className="h-12 rounded-2xl px-4 text-base"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="instructions"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name} className="text-base">
                      How it should work
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                      className="min-h-32 resize-y rounded-2xl px-4 py-3 text-base leading-7"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            {form.formState.errors.root?.server && (
              <FieldError>
                {form.formState.errors.root.server.message}
              </FieldError>
            )}
          </div>

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[1.25rem] px-6 py-5 sm:px-7">
            {bot && (
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
                  Delete bot
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the bot and its direct chats. You
                      cannot undo this action.
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
                      onClick={onDeleteBot}
                    >
                      {isDeleting && <Spinner data-icon="inline-start" />}
                      Delete bot
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isDeleting}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && (
                <Spinner data-icon="inline-start" />
              )}
              {bot ? "Save changes" : "Create bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { BotDialog }
