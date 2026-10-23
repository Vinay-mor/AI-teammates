"use client"

import { toast } from "@/components/ui/toast"

export function showUpgradeToast(
  description: string,
  onUpgrade: () => void,
) {
  toast.add({
    title: "Upgrade to use this feature",
    description,
    type: "error",
    priority: "high",
    timeout: 8000,
    actionProps: {
      children: "View plans",
      onClick: onUpgrade,
    },
  })
}
