"use client";

import { useState, useEffect } from "react";

export function TypingPrompt({ lines }: { lines: string[] }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentLine = lines[lineIndex];

    if (!isDeleting && charIndex < currentLine.length) {
      const timeout = setTimeout(
        () => setCharIndex((c) => c + 1),
        40 + Math.random() * 30,
      );
      return () => clearTimeout(timeout);
    }

    if (!isDeleting && charIndex === currentLine.length) {
      const timeout = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && charIndex > 0) {
      const timeout = setTimeout(() => setCharIndex((c) => c - 1), 20);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setLineIndex((i) => (i + 1) % lines.length);
    }
  }, [charIndex, isDeleting, lineIndex, lines]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-muted-foreground/30 text-4xl font-bold select-none">
        &gt;_
      </div>
      <div className="h-8 flex items-center">
        <span className="text-sm text-muted-foreground/60 typing-cursor pr-1">
          {lines[lineIndex].slice(0, charIndex)}
        </span>
      </div>
    </div>
  );
}
