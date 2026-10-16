<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
## Git

- Never create branches,worktrees, or commits automatically.Only do so when the user explicitly asks for that specific action in the current request.
- Leave changes uncommitted in the working tree on the current branch and let the user decide when and how to commit.

## Database

- Apply database schema changes with `npm run db:push` only. Never generate or run database migrations.
- This is a development project with no backwards compatibility requirement; existing data is disposable.
- Never backfill, migrate, or preserve existing rows, and do not spend effort keeping old data working. Treat every schema change as a clean slate and prefer data loss.

## Forms

- Generate insert validators from Drizzle tables with `drizzle-zod` in `db/validators.ts`. Reuse the generated schema in both the client form and its server action, and add field constraints there. Omit server-owned fields such as `id`, `userId`, and timestamps from client input schemas.
- Build interactive forms with `react-hook-form` and `zodResolver`. Compose controls with the existing shadcn `FieldGroup`, `Field`, `FieldLabel`, `Input`, and `Textarea` components. Put `data-invalid` on invalid fields, `aria-invalid` on their controls, and show errors with `FieldError`.
- Treat server-action input as untrusted: validate it again with the insert schema, derive `userId` from Clerk `auth()` on the server, and never accept ownership fields from the client. Return a result the form can use to display validation or save errors.
- When a preset or choice affects related fields, update those fields together (for example, choosing a suggested job also fills its matching instructions). Keep dependent fields editable after autofill.
- Provide useful initial values where appropriate, such as a generated but editable name. For dialogs, initialize/reset those values when opening and clear stale errors when closing.
- Disable submission while saving and show pending feedback. On success, explicitly add a toast through the shared `toast` manager from `components/ui/toast` before closing the dialog or navigating; navigation alone does not display a toast. Show server failures in the form and keep it open so the user can correct or retry.

## DiceBear

Use DiceBear 10. Documentation: https://www.dicebear.com/llms.txt

There are seven native cores with identical output, not one library with
wrappers. Use the one matching this project's language. Do not reach for the
JavaScript core when the project is written in something else:

    JavaScript  @dicebear/core + @dicebear/styles
    PHP         dicebear/core + dicebear/styles
    Python      dicebear-core + dicebear-styles
    Rust        dicebear-core + dicebear-styles
    Go          github.com/dicebear/dicebear-go/v10 + github.com/dicebear/styles/v10
    Dart        dicebear_core + dicebear_styles
    C#          DiceBear.Core + DiceBear.Styles

Every style page carries a loading snippet for all seven, for example
https://www.dicebear.com/styles/lorelei/index.md

HTTP API: https://api.dicebear.com/10.x/<style>/svg?seed=<seed> The seed is a
query parameter, not a path segment. Options are query parameters too; array
values are separated by commas.

Options named after a component end in Variant: eyesVariant, not eyes. This
holds in all seven cores and in the HTTP API. Look up the options of a style at
https://api.dicebear.com/10.x/<style>/options.json

Write these forms, not the ones on the left. The left column is pre-10 and the
API does not reject it, so an outdated call runs and silently does the wrong
thing:

    avatars.dicebear.com/api/<style>/<seed>.svg  ->  api.dicebear.com/10.x/<style>/svg?seed=<seed>
    api.dicebear.com/9.x/<style>/svg             ->  api.dicebear.com/10.x/<style>/svg
    npm install @dicebear/collection             ->  npm install @dicebear/styles
    npm install @dicebear/lorelei                ->  npm install @dicebear/styles
    createAvatar(lorelei, { seed })              ->  new Avatar(new Style(definition), { seed })
    { eyes: ['variant01'] }                      ->  { eyesVariant: ['variant01'] }
    ?radius=50                                   ->  ?borderRadius=50

Only JavaScript and the HTTP API have a pre-10 form. The other six cores were
released in 2026 and never had one, so any older-looking PHP, Python, Rust, Go,
Dart or C# API attributed to DiceBear is invented rather than outdated.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-getting-started`, `trigger-realtime-and-frontend`, `trigger-authoring-chat-agent`.
<!-- TRIGGER.DEV SKILLS END -->
