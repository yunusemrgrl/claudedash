"use client";

import type { ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

const POSITION = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
} as const;

export function Tooltip({ content, children, side = "bottom" }: TooltipProps) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div
        role="tooltip"
        className={`absolute ${POSITION[side]} px-2 py-1 bg-popover border border-border text-popover-foreground text-[11px] leading-snug rounded shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50`}
      >
        {content}
      </div>
    </div>
  );
}
