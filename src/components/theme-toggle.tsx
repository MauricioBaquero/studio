
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
        // Light mode: show dark button to switch to dark
        "dark:bg-background dark:text-foreground dark:hover:bg-muted",
        // Dark mode: show light button to switch to light
        "bg-foreground text-background hover:bg-muted-foreground"
      )}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 transition-all dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 transition-all dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
