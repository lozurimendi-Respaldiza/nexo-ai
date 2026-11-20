"use client";

import { useEffect, useState } from "react";

function toLocalInputValue(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (number: number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LocalDateTime({
  value,
}: {
  value: string | null;
}) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    if (!value) {
      setFormatted("");
      return;
    }

    const date = new Date(value);

    setFormatted(
      Number.isNaN(date.getTime())
        ? ""
        : new Intl.DateTimeFormat("es-ES", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(date)
    );
  }, [value]);

  if (!formatted || !value) return null;

  return <time dateTime={value}>{formatted}</time>;
}

export function LocalDate({
  value,
}: {
  value: string | null;
}) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    if (!value) {
      setFormatted("");
      return;
    }

    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = isDateOnly
      ? new Date(`${value}T12:00:00Z`)
      : new Date(value);

    setFormatted(
      Number.isNaN(date.getTime())
        ? ""
        : new Intl.DateTimeFormat("es-ES", {
            dateStyle: "medium",
            ...(isDateOnly ? { timeZone: "UTC" } : {}),
          }).format(date)
    );
  }, [value]);

  if (!formatted || !value) return null;

  return <time dateTime={value}>{formatted}</time>;
}

export function LocalDateTimeField({
  name,
  initialValue,
  className,
}: {
  name: string;
  initialValue?: string | null;
  className: string;
}) {
  const [localValue, setLocalValue] = useState("");
  const [utcValue, setUtcValue] = useState("");

  useEffect(() => {
    setLocalValue(toLocalInputValue(initialValue));
    setUtcValue(initialValue ?? "");
  }, [initialValue]);

  function handleChange(value: string) {
    setLocalValue(value);

    if (!value) {
      setUtcValue("");
      return;
    }

    const date = new Date(value);
    setUtcValue(
      Number.isNaN(date.getTime()) ? "" : date.toISOString()
    );
  }

  return (
    <>
      <input
        type="datetime-local"
        value={localValue}
        onChange={(event) => handleChange(event.target.value)}
        className={className}
      />
      <input type="hidden" name={name} value={utcValue} />
    </>
  );
}
