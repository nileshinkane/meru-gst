import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@meru/ui/lib/utils";

export interface ClipTab {
  name: string;
  icon?: ReactNode;
  value?: string;
}

export interface ClipTabsProps {
  tabs: ClipTab[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

function ClipTabs({
  tabs,
  value: controlledValue,
  defaultValue,
  onValueChange,
  className,
}: ClipTabsProps) {
  const isControlled = typeof controlledValue === "string";
  const getInitialValue = () => {
    if (defaultValue) return defaultValue;
    if (tabs.length > 0) {
      return tabs[0]?.value ?? tabs[0]?.name ?? "";
    }
    return "";
  };

  const [uncontrolledValue, setUncontrolledValue] =
    useState<string>(getInitialValue);

  const activeValue = isControlled ? controlledValue : uncontrolledValue;
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabElementRef = useRef<HTMLButtonElement>(null);

  const handleValueChange = useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [isControlled, onValueChange],
  );

  useEffect(() => {
    const container = containerRef.current;
    const activeTabElement = activeTabElementRef.current;

    if (!activeValue || !container || !activeTabElement) return;

    const updateClipPath = () => {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeTabElement.getBoundingClientRect();

      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      if (containerWidth === 0 || containerHeight === 0) return;

      const buttonLeftRelativeToContainer = buttonRect.left - containerRect.left;
      const buttonRightRelativeToContainer = buttonRect.right - containerRect.left;
      const buttonTopRelativeToContainer = buttonRect.top - containerRect.top;
      const buttonBottomRelativeToContainer =
        buttonRect.bottom - containerRect.top;

      const leftPercent =
        (buttonLeftRelativeToContainer / containerWidth) * 100;
      const rightPercent =
        ((containerWidth - buttonRightRelativeToContainer) / containerWidth) *
        100;
      const topPercent = (buttonTopRelativeToContainer / containerHeight) * 100;
      const bottomPercent =
        ((containerHeight - buttonBottomRelativeToContainer) / containerHeight) *
        100;

      container.style.clipPath = `inset(${topPercent.toFixed(2)}% ${rightPercent.toFixed(2)}% ${bottomPercent.toFixed(2)}% ${leftPercent.toFixed(2)}% round 0.375rem)`;
    };

    updateClipPath();

    const resizeObserver = new ResizeObserver(() => {
      updateClipPath();
    });

    resizeObserver.observe(container);
    resizeObserver.observe(activeTabElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeValue]);

  const getTabValue = (tab: ClipTab) => tab.value ?? tab.name;

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative inline-flex cursor-pointer", className)}>
      <ul
        className="relative flex items-center gap-0 rounded-md bg-white p-0.5 shadow ring-1 ring-border dark:bg-secondary"
        role="tablist"
      >
        {tabs.map((tab) => {
          const tabValue = getTabValue(tab);
          const isActive = activeValue === tabValue;

          return (
            <li key={tabValue}>
              <button
                ref={isActive ? activeTabElementRef : null}
                data-tab={tabValue}
                onClick={() => handleValueChange(tabValue)}
                className={cn(
                  "relative flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
                aria-selected={isActive}
                role="tab"
                type="button"
              >
                {tab.icon}
                {tab.name}
              </button>
            </li>
          );
        })}
      </ul>

      <div
        aria-hidden
        ref={containerRef}
        className="pointer-events-none absolute inset-0 z-10 flex items-center gap-0 bg-primary p-0.5"
        style={{ transition: "clip-path 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <ul className="flex items-center gap-0">
          {tabs.map((tab) => {
            const tabValue = getTabValue(tab);
            return (
              <li key={tabValue}>
                <button
                  data-tab={tabValue}
                  onClick={() => handleValueChange(tabValue)}
                  className={cn(
                    "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary-foreground",
                    "focus-visible:outline-none",
                  )}
                  tabIndex={-1}
                  aria-hidden="true"
                  type="button"
                >
                  {tab.icon}
                  {tab.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export { ClipTabs };
