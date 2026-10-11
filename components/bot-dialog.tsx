"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { nanoid } from "nanoid"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { ShuffleIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { createBot } from "@/action/bot"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const botFormSchema = insertBotSchema.extend({
  instructions: z
    .string()
    .max(4000, "Instructions must be 4000 characters or fewer."),
})

type BotFormValues = z.infer<typeof botFormSchema>

function BotDialog() {
  const [open, setOpen] = useState(false)
  const [avatar, setAvatar] = useState(() => nanoid())
  const router = useRouter()
  const form = useForm<BotFormValues>({
    resolver: zodResolver(botFormSchema),
    defaultValues: {
      avatar,
      name: "",
      job: "",
      instructions: "",
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen && !open) {
      form.reset({
        avatar,
        name: getRandomBotName(),
        job: "",
        instructions: "",
      })
    } else if (!nextOpen) {
      form.clearErrors()
      form.reset({ avatar, name: "", job: "", instructions: "" })
    }
  }

  async function onSubmit(values: BotFormValues) {
    const result = await createBot(values)

    if (!result.success) {
      form.setError("root.server", { message: result.error })
      return
    }

    toast.add({
      title: "Bot created",
      description: `${values.name} is ready to work.`,
      type: "success",
    })
    setOpen(false)
    router.push("/dashboard")
    router.refresh()
  }

  function shuffleAvatar() {
    const nextAvatar = nanoid()
    setAvatar(nextAvatar)
    form.setValue("avatar", nextAvatar, { shouldValidate: true })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="secondary"
            size="lg"
            className="h-11 rounded-xl px-4 text-base"
          />
        }
      >
        Create a new bot
      </DialogTrigger>
      <DialogContent className="dark max-h-[calc(100svh-2rem)] max-w-[52rem] gap-0 overflow-y-auto rounded-[1.25rem] border border-border bg-popover p-0 text-base shadow-2xl sm:max-w-[52rem]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6 px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
            <DialogHeader className="gap-2 text-left">
              <DialogTitle className="text-2xl leading-tight font-medium">
                New bot
              </DialogTitle>
              <DialogDescription className="text-lg leading-7">
                Give it a face, a name, and a job to do.
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
            <Button
              type="button"
              variant="outline"
              size="lg"
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
              Create bot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { BotDialog }
