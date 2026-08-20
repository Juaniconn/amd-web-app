"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  displayMoney,
  formatMoney,
  parseMoney,
} from "@/lib/quotes/money";

export function MoneyInput({
  id,
  name,
  currency,
  value,
  onChange,
  required,
}: {
  id?: string;
  name?: string;
  currency: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const blank = value.trim() === "";
  const numeric = formatMoney(parseMoney(value));

  return (
    <>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        required={required}
        value={focused ? value : blank ? "" : displayMoney(numeric, currency)}
        onFocus={(event) => {
          setFocused(true);
          if (!blank) onChange(numeric);
          requestAnimationFrame(() => event.target.select());
        }}
        onBlur={() => {
          setFocused(false);
          if (value.trim() !== "") onChange(numeric);
        }}
        onChange={(event) => onChange(event.target.value)}
      />
      {name ? <input type="hidden" name={name} value={blank ? "" : numeric} /> : null}
    </>
  );
}
