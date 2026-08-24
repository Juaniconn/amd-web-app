import "server-only";

import { loadParts } from "@/server/services/production-kanban";
import type { PartSummary } from "@/server/services/production-kanban";

export type CalendarMonth = {
  year: number;
  month: number; // 0-indexed
  monthLabel: string;
  weeks: {
    days: (
      | null
      | {
          day: number;
          isoDate: string;
          isToday: boolean;
          isWeekend: boolean;
          parts: PartSummary[];
        }
    )[];
  }[];
  unscheduled: PartSummary[];
};

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function isoLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getProductionCalendar(
  yearInput?: number,
  monthInput?: number,
): Promise<CalendarMonth> {
  const now = new Date();
  const year = yearInput ?? now.getFullYear();
  const month = monthInput ?? now.getMonth();

  const parts = await loadParts();
  const byDay = new Map<string, PartSummary[]>();
  const unscheduled: PartSummary[] = [];

  for (const part of parts) {
    if (!part.promisedDate) {
      unscheduled.push(part);
      continue;
    }
    const d = new Date(part.promisedDate);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const key = isoLocal(d);
    const list = byDay.get(key) ?? [];
    list.push(part);
    byDay.set(key, list);
  }

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // week starts Monday
  const todayIso = isoLocal(now);

  const cells: (CalendarMonth["weeks"][number]["days"][number])[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(year, month, day).getDay();
    cells.push({
      day,
      isoDate,
      isToday: isoDate === todayIso,
      isWeekend: weekday === 0 || weekday === 6,
      parts: byDay.get(isoDate) ?? [],
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: CalendarMonth["weeks"] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push({ days: cells.slice(i, i + 7) });

  return {
    year,
    month,
    monthLabel: `${MONTH_LABELS[month]} ${year}`,
    weeks,
    unscheduled,
  };
}

export type GanttLane = {
  id: string;
  label: string;
  customerName: string;
  status: string;
  priority: string;
  promisedDate: Date;
  progressPercent: number;
  isDelayed: boolean;
};

export async function getProductionGantt(): Promise<{
  lanes: GanttLane[];
  rangeStart: Date;
  rangeEnd: Date;
}> {
  const parts = await loadParts();
  const now = new Date();
  const open = parts.filter(
    (p) => p.status !== "terminada" && p.status !== "entregada",
  );
  const closedRecent = parts.filter(
    (p) =>
      (p.status === "terminada" || p.status === "entregada") &&
      now.getTime() - new Date(p.promisedDate).getTime() < 45 * 24 * 3600 * 1000,
  );
  const visible = [...open, ...closedRecent].sort(
    (a, b) => new Date(a.promisedDate).getTime() - new Date(b.promisedDate).getTime(),
  );

  let min = now.getTime() - 14 * 24 * 3600 * 1000;
  let max = now.getTime() + 45 * 24 * 3600 * 1000;
  for (const p of visible) {
    const t = new Date(p.promisedDate).getTime();
    if (t < min) min = t;
    if (t > max) max = t;
  }
  const rangeStart = new Date(min);
  const rangeEnd = new Date(max);

  const lanes: GanttLane[] = visible.map((p) => ({
    id: p.id,
    label: `${p.number}${p.partNumber ? ` · ${p.partNumber}` : ""}`,
    customerName: p.customerName,
    status: p.status,
    priority: p.priority,
    promisedDate: p.promisedDate,
    progressPercent:
      p.operationsTotal > 0
        ? Math.round((p.operationsDone / p.operationsTotal) * 100)
        : 0,
    isDelayed: p.isDelayed,
  }));

  return { lanes, rangeStart, rangeEnd };
}
