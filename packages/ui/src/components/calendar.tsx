"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@meru/ui/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-3 text-sm [--rdp-cell-size:2rem] [--rdp-nav-button-size:2rem]",
        className
      )}
      classNames={{
        root: cn(defaultClassNames.root, "w-fit"),
        months: cn(
          defaultClassNames.months,
          "relative flex flex-col gap-4 sm:flex-row"
        ),
        month: cn(defaultClassNames.month, "space-y-3"),
        month_caption: cn(
          defaultClassNames.month_caption,
          "flex h-8 items-center justify-center px-8"
        ),
        caption_label: cn(
          defaultClassNames.caption_label,
          "text-sm font-medium"
        ),
        nav: cn(
          defaultClassNames.nav,
          "absolute inset-x-0 top-0 flex items-center justify-between"
        ),
        button_previous: cn(
          defaultClassNames.button_previous,
          "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        ),
        button_next: cn(
          defaultClassNames.button_next,
          "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        ),
        month_grid: cn(defaultClassNames.month_grid, "w-full border-collapse"),
        weekdays: cn(defaultClassNames.weekdays, "flex"),
        weekday: cn(
          defaultClassNames.weekday,
          "flex size-(--rdp-cell-size) items-center justify-center text-[0.75rem] font-normal text-muted-foreground"
        ),
        week: cn(defaultClassNames.week, "mt-1 flex w-full"),
        day: cn(
          defaultClassNames.day,
          "relative flex size-(--rdp-cell-size) items-center justify-center p-0 text-center"
        ),
        day_button: cn(
          defaultClassNames.day_button,
          "inline-flex size-(--rdp-cell-size) items-center justify-center rounded-md text-sm font-normal transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        ),
        today: cn(
          defaultClassNames.today,
          "[&>button]:border [&>button]:border-border [&>button]:font-medium"
        ),
        selected: cn(
          defaultClassNames.selected,
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:focus:bg-primary [&>button]:focus:text-primary-foreground"
        ),
        outside: cn(
          defaultClassNames.outside,
          "[&>button]:text-muted-foreground/60"
        ),
        disabled: cn(
          defaultClassNames.disabled,
          "[&>button]:pointer-events-none [&>button]:opacity-50"
        ),
        hidden: cn(defaultClassNames.hidden, "invisible"),
        range_start: cn(
          defaultClassNames.range_start,
          "rounded-l-md bg-accent [&>button]:bg-primary [&>button]:text-primary-foreground"
        ),
        range_middle: cn(
          defaultClassNames.range_middle,
          "bg-accent [&>button]:rounded-none"
        ),
        range_end: cn(
          defaultClassNames.range_end,
          "rounded-r-md bg-accent [&>button]:bg-primary [&>button]:text-primary-foreground"
        ),
        dropdowns: cn(
          defaultClassNames.dropdowns,
          "flex items-center gap-1 text-sm"
        ),
        dropdown_root: cn(defaultClassNames.dropdown_root, "relative"),
        dropdown: cn(
          defaultClassNames.dropdown,
          "absolute inset-0 cursor-pointer opacity-0"
        ),
        months_dropdown: cn(
          defaultClassNames.months_dropdown,
          "rounded-md border border-input bg-background px-2 py-1 text-sm"
        ),
        years_dropdown: cn(
          defaultClassNames.years_dropdown,
          "rounded-md border border-input bg-background px-2 py-1 text-sm"
        ),
        chevron: cn(defaultClassNames.chevron, "size-4"),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("size-4", className)} {...props} />
          }

          if (orientation === "right") {
            return <ChevronRightIcon className={cn("size-4", className)} {...props} />
          }

          if (orientation === "up") {
            return <ChevronUpIcon className={cn("size-4", className)} {...props} />
          }

          return <ChevronDownIcon className={cn("size-4", className)} {...props} />
        },
        ...props.components,
      }}
      {...props}
    />
  )
}

export { Calendar }
