import { Avatar, Style } from "@dicebear/core"
import voxelBot from "@dicebear/styles/voxel-bot.json" with { type: "json" }
import Image from "next/image"
import { cn } from "cn"

const voxelBotStyle = new Style(voxelBot)

type ChatAvatarProps = {
  seed: string
  animated?: boolean
  className?: string
}

function ChatAvatar({
  seed,
  animated = false,
  className,
}: ChatAvatarProps) {
  const src = new Avatar(voxelBotStyle, {
    seed,
    size: 32,
    backgroundColor: [],
    animationVariant: animated ? "medium" : "none",
  }).toDataUri()

  return (
    <Image
      src={src}
      alt="Chat avatar"
      width={32}
      height={32}
      unoptimized
      className={cn("size-8", className)}
    />
  )
}

export { ChatAvatar }
