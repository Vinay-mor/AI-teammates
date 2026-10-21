import { cn } from "cn"

import { ChatAvatar } from "@/components/chat-avatar"

export function GroupChatAvatar({
  avatars,
  className,
}: {
  avatars: string[]
  className?: string
}) {
  const visible = avatars.slice(0, 3)
  const hiddenCount = Math.max(0, avatars.length - visible.length)

  if (avatars.length <= 1) {
    return (
      <ChatAvatar seed={avatars[0] ?? "group-chat"} className={className} />
    )
  }

  return (
    <span
      aria-label={`${avatars.length} bots in group chat`}
      className={cn("relative inline-block size-8 shrink-0", className)}
      role="img"
    >
      {avatars.length === 2 ? (
        <>
          {visible.map((avatar, index) => (
            <ChatAvatar
              key={avatar}
              seed={avatar}
              className={cn(
                "absolute size-[70%] rounded-full border-2 border-background",
                index === 0 ? "top-0 left-0" : "right-0 bottom-0"
              )}
            />
          ))}
        </>
      ) : avatars.length === 3 ? (
        <>
          {visible.map((avatar, index) => (
            <ChatAvatar
              key={avatar}
              seed={avatar}
              className={cn(
                "absolute size-[58%] rounded-full border-2 border-background",
                index === 0 && "top-0 left-1/2 -translate-x-1/2",
                index === 1 && "bottom-0 left-0",
                index === 2 && "right-0 bottom-0"
              )}
            />
          ))}
        </>
      ) : (
        <span className="grid size-full grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-md">
          {visible.map((avatar) => (
            <ChatAvatar
              key={avatar}
              seed={avatar}
              className="size-full rounded-sm"
            />
          ))}
          <span className="grid place-items-center rounded-sm bg-neutral-700 text-[10px] font-semibold text-white">
            +{hiddenCount}
          </span>
        </span>
      )}
    </span>
  )
}
