"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Call onComplete when all digits are entered
  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const focusInput = useCallback((index: number) => {
    const input = inputRefs.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const handleChange = useCallback(
    (index: number, digit: string) => {
      // Only accept digits
      if (digit && !/^\d$/.test(digit)) {
        return;
      }

      const newValue = value.split("");
      newValue[index] = digit;
      const updatedValue = newValue.join("").slice(0, length);
      onChange(updatedValue);

      // Move to next input if digit was entered
      if (digit && index < length - 1) {
        focusInput(index + 1);
      }
    },
    [value, length, onChange, focusInput]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "Backspace":
          e.preventDefault();
          if (value[index]) {
            // Clear current input
            handleChange(index, "");
          } else if (index > 0) {
            // Move to previous input and clear it
            focusInput(index - 1);
            handleChange(index - 1, "");
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (index > 0) {
            focusInput(index - 1);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (index < length - 1) {
            focusInput(index + 1);
          }
          break;
        case "Delete":
          e.preventDefault();
          handleChange(index, "");
          break;
      }
    },
    [value, length, handleChange, focusInput]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text/plain").trim();

      // Extract only digits
      const digits = pastedData.replace(/\D/g, "").slice(0, length);

      if (digits) {
        onChange(digits);
        // Focus the next empty input or last input
        const nextIndex = Math.min(digits.length, length - 1);
        focusInput(nextIndex);
      }
    },
    [length, onChange, focusInput]
  );

  const handleFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedIndex(null);
  }, []);

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }, (_, index) => (
        <Input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            "w-12 h-14 text-center text-2xl font-semibold",
            "transition-all duration-200",
            error && "border-destructive focus-visible:ring-destructive",
            focusedIndex === index && "ring-2 ring-indigo-500 border-indigo-500",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
