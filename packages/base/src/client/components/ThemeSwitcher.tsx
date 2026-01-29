import { type ThemePreference, useTheme } from "../contexts/ThemeContext"
import { cn } from "../utils/cn"
import { Button } from "./Button"
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "./Icons"
import { Popover } from "./Popover"

const themeOptions: {
  value: ThemePreference
  label: string
  icon: typeof SunIcon
}[] = [
  { value: "system", label: "System", icon: MonitorIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
]

export function ThemeSwitcher() {
  const { preference, setPreference, resolvedTheme } = useTheme()

  const CurrentIcon = resolvedTheme === "dark" ? MoonIcon : SunIcon

  return (
    <Popover
      placement="bottom"
      closeOnSelect
      contentClassName="right-0 left-auto min-w-[140px]"
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-foreground/10"
          aria-label="Toggle theme"
        >
          <CurrentIcon className="w-5 h-5" />
        </Button>
      }
    >
      <div>
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant="ghost"
            onClick={() => setPreference(value)}
            className={cn(
              "w-full flex items-center justify-start gap-3 px-3 py-2 text-sm rounded-none hover:bg-foreground/10",
              preference === value && "text-anchor",
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="flex-1 text-left">{label}</span>
            {preference === value && <CheckIcon className="w-4 h-4" />}
          </Button>
        ))}
      </div>
    </Popover>
  )
}
