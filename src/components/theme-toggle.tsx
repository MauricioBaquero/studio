
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
        "dark:bg-foreground dark:text-background dark:hover:bg-muted-foreground",
        "bg-background text-foreground hover:bg-muted"
      )}
    >
      <Sun className="absolute h-[1.2rem] w-[1.2rem] scale-100 transition-all dark:scale-0" />
      <Moon className="h-[1.2rem] w-[1.2rem] scale-0 transition-all dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
