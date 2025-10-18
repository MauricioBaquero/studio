
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      className={cn(
        "relative",
        // When in light mode, show a dark button to switch to dark mode
        "bg-foreground text-background hover:bg-muted-foreground",
        // When in dark mode, show a light button to switch to light mode
        "dark:bg-background dark:text-foreground dark:hover:bg-muted"
      )}
    >
      <Sun className="absolute h-[1.2rem] w-[1.2rem] scale-0 dark:scale-100" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-100 dark:scale-0" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
