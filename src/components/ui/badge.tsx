import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
      color: {
        default: "",
        red: "bg-red-100 text-red-800 border-transparent dark:bg-red-900/50 dark:text-red-300",
        orange: "bg-orange-100 text-orange-800 border-transparent dark:bg-orange-900/50 dark:text-orange-300",
        yellow: "bg-yellow-100 text-yellow-800 border-transparent dark:bg-yellow-900/50 dark:text-yellow-300",
        green: "bg-green-100 text-green-800 border-transparent dark:bg-green-900/50 dark:text-green-300",
        blue: "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-900/50 dark:text-blue-300",
        purple: "bg-purple-100 text-purple-800 border-transparent dark:bg-purple-900/50 dark:text-purple-300",
        gray: "bg-gray-100 text-gray-800 border-transparent dark:bg-gray-900/50 dark:text-gray-300",
      },
    },
    defaultVariants: {
      variant: "default",
      color: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, color, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, color }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
