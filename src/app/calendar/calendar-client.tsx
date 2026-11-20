
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
} from "./actions";

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  contact_id: string | null;
  opportunity_id: string | null;
  created_by: string;
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  company: string | null;
};

type Opportunity = {
  id: string;
  title: string;
  next_action_at: string | null;
};

type Props = {
  events: CalendarEvent[];
  contacts: Contact[];
  opportunities: Opportunity[];
  currentUserId: string;
  error?: string;
  saved?: boolean;
  deleted?: boolean;
};

type View = "month" | "week" | "day";

const inputClass =
  "nexo-field mt-1 block w-full rounded-lg px-3 py-2.5 text-sm outline-none";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localInputValue(value?: string) {
  const date = value ? new Date(value) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-ES", options).format(date);
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export default function CalendarClient({
  events,
  contacts,
  opportunities,
  currentUserId,
  error,
  saved,
  deleted,
}: Props) {
  const [view, setView] = useState<View>("month");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formStart, setFormStart] = useState(() => localInputValue());
  const [formEnd, setFormEnd] = useState(() =>
    localInputValue(new Date(Date.now() + 60 * 60 * 1000).toISOString())
  );

  const visibleDates = useMemo(() => {
    if (view === "day") return [new Date(selectedDate)];

    if (view === "week") {
      const start = startOfWeek(selectedDate);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }

    const first = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1
    );
    const start = startOfWeek(first);

    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [selectedDate, view]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const key = dateKey(new Date(event.starts_at));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }

    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.starts_at).getTime() -
          new Date(b.starts_at).getTime()
      );
    }

    return map;
  }, [events]);

  const opportunitiesByDay = useMemo(() => {
    const map = new Map<string, Opportunity[]>();

    for (const opportunity of opportunities) {
      if (!opportunity.next_action_at) continue;

      const key = dateKey(new Date(opportunity.next_action_at));
      const list = map.get(key) ?? [];

      list.push(opportunity);
      map.set(key, list);
    }

    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.next_action_at!).getTime() -
          new Date(b.next_action_at!).getTime()
      );
    }

    return map;
  }, [opportunities]);

  function navigate(direction: number) {
    const next = new Date(selectedDate);

    if (view === "month") {
      next.setMonth(next.getMonth() + direction);
    } else if (view === "week") {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setDate(next.getDate() + direction);
    }

    setSelectedDate(next);
  }

  function openNew(date?: Date) {
    const start = date ? new Date(date) : new Date();
    start.setHours(9, 0, 0, 0);

    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    setEditing(null);
    setFormStart(localInputValue(start.toISOString()));
    setFormEnd(localInputValue(end.toISOString()));
    setShowForm(true);
  }

  function openEdit(event: CalendarEvent) {
    if (event.created_by !== currentUserId) return;

    setEditing(event);
    setFormStart(localInputValue(event.starts_at));
    setFormEnd(localInputValue(event.ends_at));
    setShowForm(true);
  }

  const heading =
    view === "month"
      ? formatDate(selectedDate, { month: "long", year: "numeric" })
      : view === "week"
        ? `${formatDate(visibleDates[0], { day: "numeric", month: "short" })} – ${formatDate(visibleDates[6], { day: "numeric", month: "short", year: "numeric" })}`
        : formatDate(selectedDate, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });

  return (
    <div className="nexo-calendar">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl font-semibold capitalize"
            style={{ color: "var(--ink)" }}
          >
            {heading}
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--warning)" }}
          >
            Las citas vinculadas son compartidas con el equipo. Las
            independientes son privadas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openNew()}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-foreground, var(--ink))",
          }}
        >
          + Nueva cita
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="nexo-field rounded-lg px-3 py-2 text-sm"
          >
            ←
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(new Date())}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--line)",
              color: "var(--ink)",
            }}
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => navigate(1)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--line)",
              color: "var(--ink)",
            }}
          >
            →
          </button>
        </div>

        <div
          className="flex rounded-lg border p-1"
          style={{
            borderColor: "var(--line)",
            backgroundColor: "var(--surface)",
          }}
        >
          {(["month", "week", "day"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className="rounded-md px-3 py-2 text-sm transition-colors"
              style={{
                backgroundColor:
                  view === item ? "var(--accent)" : "transparent",
                color:
                  view === item
                    ? "var(--accent-foreground, var(--ink))"
                    : "var(--muted)",
                fontWeight: view === item ? 600 : 400,
              }}
            >
              {item === "month" ? "Mes" : item === "week" ? "Semana" : "Día"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border p-3 text-sm"
          style={{
            borderColor: "var(--danger)",
            backgroundColor: "var(--danger-soft)",
            color: "var(--danger)",
          }}
        >
          {error === "forbidden"
            ? "No tienes permiso para modificar esa cita."
            : "No se pudo guardar la cita. Comprueba los datos y vuelve a intentarlo."}
        </p>
      )}

      {saved && (
        <p
          className="mt-4 rounded-lg border p-3 text-sm"
          style={{
            borderColor: "var(--success)",
            backgroundColor: "var(--success-soft)",
            color: "var(--success)",
          }}
        >
          Cita guardada correctamente.
        </p>
      )}

      {deleted && (
        <p
          className="mt-4 rounded-lg border p-3 text-sm"
          style={{
            borderColor: "var(--success)",
            backgroundColor: "var(--success-soft)",
            color: "var(--success)",
          }}
        >
          Cita eliminada.
        </p>
      )}

      {view === "month" && (
        <div
          className="mt-5 overflow-hidden rounded-xl border"
          style={{
            borderColor: "var(--line)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div
            className="grid grid-cols-7 border-b"
            style={{
              borderColor: "var(--line)",
              backgroundColor: "var(--surface-secondary)",
            }}
          >
            {weekdays.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-xs font-semibold"
                style={{ color: "var(--muted)" }}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {visibleDates.map((date) => {
              const key = dateKey(date);
              const dayEvents = eventsByDay.get(key) ?? [];
              const dayOpportunities = opportunitiesByDay.get(key) ?? [];
              const inMonth = date.getMonth() === selectedDate.getMonth();
              const today = key === dateKey(new Date());

              return (
                <div
                  key={key}
                  className="min-h-28 border-b border-r p-1 sm:min-h-32 sm:p-2"
                  style={{
                    borderColor: "var(--line)",
                    backgroundColor: inMonth
                      ? "var(--surface)"
                      : "var(--surface-secondary)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(date);
                      setView("day");
                    }}
                    className="mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs"
                    style={{
                      backgroundColor: today ? "var(--accent)" : "transparent",
                      color: today
                        ? "var(--accent-foreground, var(--ink))"
                        : "var(--ink)",
                      fontWeight: today ? 700 : 400,
                    }}
                  >
                    {date.getDate()}
                  </button>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => openEdit(event)}
                        className="block w-full truncate rounded px-1 py-1 text-left text-[10px] sm:text-xs"
                        style={{
                          backgroundColor:
                            event.contact_id || event.opportunity_id
                              ? "var(--accent-soft)"
                              : "var(--surface-secondary)",
                          color:
                            event.contact_id || event.opportunity_id
                              ? "var(--accent)"
                              : "var(--ink)",
                        }}
                        title={event.title}
                      >
                        {formatDate(new Date(event.starts_at), {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {event.title}
                      </button>
                    ))}

                    {dayOpportunities.slice(0, 3).map((opportunity) => (
                      <Link
                        key={opportunity.id}
                        href={`/opportunities/${opportunity.id}`}
                        className="block w-full truncate rounded px-1 py-1 text-left text-[10px] sm:text-xs"
                        style={{
                          backgroundColor: "var(--warning-soft)",
                          color: "var(--warning)",
                        }}
                        title={`Próxima acción: ${opportunity.title}`}
                      >
                        {formatDate(new Date(opportunity.next_action_at!), {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {opportunity.title}
                      </Link>
                    ))}

                    {dayEvents.length > 3 && (
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--muted)" }}
                      >
                        +{dayEvents.length - 3} citas más
                      </p>
                    )}

                    {dayOpportunities.length > 3 && (
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--warning)" }}
                      >
                        +{dayOpportunities.length - 3} oportunidades más
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {visibleDates.map((date) => {
            const key = dateKey(date);
            const dayEvents = eventsByDay.get(key) ?? [];
            const dayOpportunities = opportunitiesByDay.get(key) ?? [];

            return (
              <div
                key={key}
                className="nexo-card min-h-48 rounded-xl p-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    setView("day");
                  }}
                  className="font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  {formatDate(date, { weekday: "short", day: "numeric" })}
                </button>

                <div className="mt-3 space-y-2">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openEdit(event)}
                      className="nexo-card block w-full rounded-lg p-2 text-left"
                    >
                      <span
                        className="text-xs"
                        style={{ color: "var(--accent)" }}
                      >
                        {formatDate(new Date(event.starts_at), {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="mt-1 block text-sm">
                        {event.title}
                      </span>
                    </button>
                  ))}

                  {dayOpportunities.map((opportunity) => (
                    <Link
                      key={opportunity.id}
                      href={`/opportunities/${opportunity.id}`}
                      className="block w-full rounded-lg border p-2 text-left"
                      style={{
                        borderColor: "var(--warning)",
                        backgroundColor: "var(--warning-soft)",
                      }}
                    >
                      <span
                        className="text-xs"
                        style={{ color: "var(--warning)" }}
                      >
                        {formatDate(new Date(opportunity.next_action_at!), {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · Próxima acción"}
                      </span>
                      <span
                        className="mt-1 block text-sm"
                        style={{ color: "var(--ink)" }}
                      >
                        {opportunity.title}
                      </span>
                    </Link>
                  ))}

                  <button
                    type="button"
                    onClick={() => openNew(date)}
                    className="text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    + Añadir cita
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "day" && (
        <div className="nexo-card mt-5 rounded-xl p-4">
          <div className="space-y-3">
            {(eventsByDay.get(dateKey(selectedDate)) ?? []).map((event) => {
              const editable = event.created_by === currentUserId;

              return (
                <article key={event.id} className="nexo-card rounded-lg p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--ink)" }}
                      >
                        {event.title}
                      </p>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: "var(--accent)" }}
                      >
                        {formatDate(new Date(event.starts_at), {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" – "}
                        {formatDate(new Date(event.ends_at), {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {event.description && (
                        <p className="nexo-muted mt-2 whitespace-pre-wrap text-sm">
                          {event.description}
                        </p>
                      )}
                      <p
                        className="mt-2 text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        {event.contact_id ? "Cita vinculada a contacto" : ""}
                        {event.contact_id && event.opportunity_id ? " · " : ""}
                        {event.opportunity_id
                          ? "Cita vinculada a oportunidad"
                          : ""}
                        {!event.contact_id && !event.opportunity_id
                          ? "Cita privada"
                          : ""}
                      </p>
                    </div>

                    {editable && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(event)}
                          className="nexo-field rounded-lg px-3 py-2 text-xs"
                        >
                          Editar
                        </button>
                        <form action={deleteCalendarEventAction}>
                          <input
                            type="hidden"
                            name="id"
                            value={event.id}
                          />
                          <button
                            type="submit"
                            className="rounded-lg border px-3 py-2 text-xs"
                            style={{
                              borderColor: "var(--danger)",
                              color: "var(--danger)",
                            }}
                          >
                            Eliminar
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {(opportunitiesByDay.get(dateKey(selectedDate)) ?? []).map(
              (opportunity) => (
                <article
                  key={opportunity.id}
                  className="rounded-lg border p-4"
                  style={{
                    borderColor: "var(--warning)",
                    backgroundColor: "var(--warning-soft)",
                  }}
                >
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "var(--warning)" }}
                  >
                    PRÓXIMA ACCIÓN DEL PIPELINE
                  </p>

                  <p
                    className="mt-2 text-sm font-semibold"
                    style={{ color: "var(--ink)" }}
                  >
                    {opportunity.title}
                  </p>

                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--warning)" }}
                  >
                    {formatDate(new Date(opportunity.next_action_at!), {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  <Link
                    href={`/opportunities/${opportunity.id}`}
                    className="mt-3 inline-block text-sm underline"
                    style={{ color: "var(--accent)" }}
                  >
                    Abrir oportunidad
                  </Link>
                </article>
              )
            )}

            {(eventsByDay.get(dateKey(selectedDate)) ?? []).length === 0 &&
              (opportunitiesByDay.get(dateKey(selectedDate)) ?? []).length ===
                0 && (
                <p className="nexo-muted py-10 text-center text-sm">
                  No hay citas para este día.
                </p>
              )}
          </div>

          <button
            type="button"
            onClick={() => openNew(selectedDate)}
            className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground, var(--ink))",
            }}
          >
            + Nueva cita
          </button>
        </div>
      )}

      {showForm && (
        <>
          {editing && (
            <form id="delete-calendar-event" action={deleteCalendarEventAction}>
              <input type="hidden" name="id" value={editing.id} />
            </form>
          )}

          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
            <section className="nexo-card my-6 w-full max-w-xl rounded-xl p-5 shadow-2xl sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--ink)" }}
                >
                  {editing ? "Editar cita" : "Nueva cita"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-sm transition-colors"
                  style={{ color: "var(--muted)" }}
                >
                  Cerrar
                </button>
              </div>

              <form
                action={
                  editing
                    ? updateCalendarEventAction
                    : createCalendarEventAction
                }
                className="mt-5 space-y-4"
              >
                {editing && (
                  <input type="hidden" name="id" value={editing.id} />
                )}

                <label
                  className="block text-sm"
                  style={{ color: "var(--ink)" }}
                >
                  Título
                  <input
                    name="title"
                    required
                    minLength={2}
                    maxLength={160}
                    defaultValue={editing?.title ?? ""}
                    className={inputClass}
                    placeholder="Ej. Reunión de seguimiento"
                  />
                </label>

                <label
                  className="block text-sm"
                  style={{ color: "var(--ink)" }}
                >
                  Descripción
                  <textarea
                    name="description"
                    rows={3}
                    maxLength={2000}
                    defaultValue={editing?.description ?? ""}
                    className={inputClass}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label
                    className="block text-sm"
                    style={{ color: "var(--ink)" }}
                  >
                    Inicio
                    <input
                      type="datetime-local"
                      required
                      value={formStart}
                      onChange={(event) => setFormStart(event.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="hidden"
                      name="starts_at"
                      value={new Date(formStart).toISOString()}
                    />
                  </label>

                  <label
                    className="block text-sm"
                    style={{ color: "var(--ink)" }}
                  >
                    Fin
                    <input
                      type="datetime-local"
                      required
                      value={formEnd}
                      onChange={(event) => setFormEnd(event.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="hidden"
                      name="ends_at"
                      value={new Date(formEnd).toISOString()}
                    />
                  </label>
                </div>

                <label
                  className="block text-sm"
                  style={{ color: "var(--ink)" }}
                >
                  Contacto asociado
                  <select
                    name="contact_id"
                    defaultValue={editing?.contact_id ?? ""}
                    className={inputClass}
                  >
                    <option value="">Sin contacto</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {[contact.first_name, contact.last_name]
                          .filter(Boolean)
                          .join(" ") || "Contacto"}
                        {contact.company ? ` · ${contact.company}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  className="block text-sm"
                  style={{ color: "var(--ink)" }}
                >
                  Oportunidad asociada
                  <select
                    name="opportunity_id"
                    defaultValue={editing?.opportunity_id ?? ""}
                    className={inputClass}
                  >
                    <option value="">Sin oportunidad</option>
                    {opportunities.map((opportunity) => (
                      <option key={opportunity.id} value={opportunity.id}>
                        {opportunity.title}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="nexo-muted text-xs">
                  Si vinculas la cita a un contacto o una oportunidad, será
                  visible para el equipo. Si no, solo tú podrás verla.
                </p>

                <div
                  className="flex flex-wrap justify-between gap-3 border-t pt-4"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div>
                    {editing && (
                      <button
                        type="submit"
                        form="delete-calendar-event"
                        onClick={(event) => {
                          if (
                            !window.confirm(
                              "¿Seguro que quieres eliminar esta cita?"
                            )
                          ) {
                            event.preventDefault();
                          }
                        }}
                        className="rounded-lg border px-4 py-2.5 text-sm transition-colors"
                        style={{
                          borderColor: "var(--danger)",
                          color: "var(--danger)",
                        }}
                      >
                        Eliminar cita
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="nexo-field rounded-lg px-4 py-2.5 text-sm"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "var(--accent-foreground, var(--ink))",
                      }}
                    >
                      Guardar cita
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
