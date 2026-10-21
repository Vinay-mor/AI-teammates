import { tool } from "ai"
import { z } from "zod"
import { getDaytonaClient } from "@/lib/daytona-client"

const MAX_COMMAND_OUTPUT = 16_000
const MAX_FILE_CONTENT = 100_000

async function getSandbox(sandboxId: string | null | undefined) {
  if (!sandboxId) {
    throw new Error("This AI teammate does not have a Daytona sandbox.")
  }

  const sandbox = await getDaytonaClient().get(sandboxId)
  if (sandbox.state !== "started") await sandbox.start()
  return sandbox
}

async function getComputerSandbox(sandboxId: string | null | undefined) {
  const sandbox = await getSandbox(sandboxId)
  const status = await sandbox.computerUse.getStatus()
  if (status.status !== "running" && status.status !== "active") {
    await sandbox.computerUse.start()
  }
  return sandbox
}

function screenshotTool(sandboxId: string | null | undefined, visible: boolean) {
  return tool({
    description: visible
      ? "Capture the current desktop and show the screenshot to the user. Use only when the user asks to see the screen or requests a screenshot."
      : "Capture the current desktop for your own visual inspection. The screenshot is sent to you but is hidden from the chat UI. Use this before and after desktop actions when you need visual context.",
    inputSchema: z.object({}),
    execute: async (_input: {}) => {
      const sandbox = await getComputerSandbox(sandboxId)
      const { screenshot, sizeBytes } =
        await sandbox.computerUse.screenshot.takeCompressed({
          format: "jpeg",
          quality: 70,
          scale: 0.8,
        })

      if (!screenshot) throw new Error("Daytona returned an empty screenshot.")
      return { image: screenshot, mediaType: "image/jpeg" as const, sizeBytes }
    },
    toModelOutput: ({ output }: {
      input: unknown
      output: { image: string; mediaType: string; sizeBytes: number | undefined }
    }) => ({
      type: "content",
      value: [
        {
          type: "image-data",
          mediaType: output.mediaType,
          data: output.image,
        },
      ],
    }),
  })
}

export function createChatTools(sandboxId: string | null | undefined) {
  return {
    bash: tool({
      description:
        "Run a shell command in this teammate's isolated Daytona sandbox. Use this for command-line tasks; never claim a command succeeded unless its exit code is zero.",
      inputSchema: z.object({
        command: z.string().min(1).max(8_000).describe("Shell command to run"),
        cwd: z.string().max(1_000).optional().describe("Working directory in the sandbox"),
      }),
      execute: async ({ command, cwd }) => {
        const sandbox = await getSandbox(sandboxId)
        const result = await sandbox.process.executeCommand(command, cwd, undefined, 60)
        const output = result.result ?? ""
        return {
          exitCode: result.exitCode,
          output:
            output.length > MAX_COMMAND_OUTPUT
              ? `${output.slice(0, MAX_COMMAND_OUTPUT)}\n[Output truncated]`
              : output,
        }
      },
    }),
    readFile: tool({
      description: "Read a text file from this teammate's Daytona sandbox.",
      inputSchema: z.object({ path: z.string().min(1).max(2_000) }),
      execute: async ({ path }) => {
        const sandbox = await getSandbox(sandboxId)
        const content = (await sandbox.fs.downloadFile(path)).toString("utf8")
        return content.length > MAX_FILE_CONTENT
          ? `${content.slice(0, MAX_FILE_CONTENT)}\n[File content truncated]`
          : content
      },
    }),
    writeFile: tool({
      description: "Write or replace a text file in this teammate's Daytona sandbox.",
      inputSchema: z.object({
        path: z.string().min(1).max(2_000),
        content: z.string().max(MAX_FILE_CONTENT),
      }),
      execute: async ({ path, content }) => {
        const sandbox = await getSandbox(sandboxId)
        await sandbox.fs.uploadFile(Buffer.from(content, "utf8"), path)
        return { path, bytesWritten: Buffer.byteLength(content, "utf8") }
      },
    }),
    listFiles: tool({
      description: "List files and directories in a path in this teammate's Daytona sandbox.",
      inputSchema: z.object({
        path: z.string().min(1).max(2_000).default("."),
        depth: z.number().int().min(1).max(3).default(1),
      }),
      execute: async ({ path, depth }) => {
        const sandbox = await getSandbox(sandboxId)
        return sandbox.fs.listFiles(path, { depth })
      },
    }),
    mouseClick: tool({
      description: "Click at pixel coordinates on the desktop controlled by this Daytona sandbox.",
      inputSchema: z.object({
        x: z.number().int().min(0).max(10_000),
        y: z.number().int().min(0).max(10_000),
        button: z.enum(["left", "right", "middle"]).default("left"),
        double: z.boolean().default(false),
      }),
      execute: async ({ x, y, button, double }) => {
        const sandbox = await getComputerSandbox(sandboxId)
        return sandbox.computerUse.mouse.click(x, y, button, double)
      },
    }),
    mouseMove: tool({
      description: "Move the desktop pointer to pixel coordinates.",
      inputSchema: z.object({
        x: z.number().int().min(0).max(10_000),
        y: z.number().int().min(0).max(10_000),
      }),
      execute: async ({ x, y }) => {
        const sandbox = await getComputerSandbox(sandboxId)
        return sandbox.computerUse.mouse.move(x, y)
      },
    }),
    mouseScroll: tool({
      description: "Scroll the desktop at the given pointer coordinates.",
      inputSchema: z.object({
        x: z.number().int().min(0).max(10_000),
        y: z.number().int().min(0).max(10_000),
        direction: z.enum(["up", "down", "left", "right"]),
        amount: z.number().int().min(1).max(20).default(3),
      }),
      execute: async ({ x, y, direction, amount }) => {
        const sandbox = await getComputerSandbox(sandboxId)
        return sandbox.computerUse.mouse.scroll(x, y, direction, amount)
      },
    }),
    keyboardType: tool({
      description: "Type text into the currently focused desktop control.",
      inputSchema: z.object({ text: z.string().max(10_000) }),
      execute: async ({ text }) => {
        const sandbox = await getComputerSandbox(sandboxId)
        await sandbox.computerUse.keyboard.type(text)
        return { typedCharacters: text.length }
      },
    }),
    keyboardPress: tool({
      description:
        "Press a keyboard key, optionally with modifiers such as ctrl, shift, alt, or cmd.",
      inputSchema: z.object({
        key: z.string().min(1).max(40),
        modifiers: z.array(z.enum(["ctrl", "shift", "alt", "cmd"])).max(4).default([]),
      }),
      execute: async ({ key, modifiers }) => {
        const sandbox = await getComputerSandbox(sandboxId)
        await sandbox.computerUse.keyboard.press(key, modifiers)
        return { pressed: key, modifiers }
      },
    }),
    viewScreen: screenshotTool(sandboxId, false),
    showScreen: screenshotTool(sandboxId, true),
  }
}
