import { boolean, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const plantRates = pgTable("plant_rates", {
  id: text("id").primaryKey(),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  defaultMarginPct: numeric("default_margin_pct", { precision: 8, scale: 4 })
    .notNull()
    .default("30"),
  a36CostPerKg: numeric("a36_cost_per_kg", { precision: 14, scale: 4 })
    .notNull()
    .default("38"),
  machineHourly: numeric("machine_hourly", { precision: 14, scale: 4 })
    .notNull()
    .default("1200"),
  pressHourly: numeric("press_hourly", { precision: 14, scale: 4 })
    .notNull()
    .default("650"),
  bendUnitCost: numeric("bend_unit_cost", { precision: 14, scale: 4 })
    .notNull()
    .default("18"),
  powderCoatMin: numeric("powder_coat_min", { precision: 14, scale: 4 })
    .notNull()
    .default("480"),
  powderCoatPerM2: numeric("powder_coat_per_m2", { precision: 14, scale: 4 })
    .notNull()
    .default("165"),
  engineeringHours: numeric("engineering_hours", { precision: 8, scale: 4 })
    .notNull()
    .default("1.5"),
  engineeringHourly: numeric("engineering_hourly", { precision: 14, scale: 4 })
    .notNull()
    .default("450"),
  packingUnit: numeric("packing_unit", { precision: 14, scale: 4 })
    .notNull()
    .default("75"),
  cutSpeedIpm: numeric("cut_speed_ipm", { precision: 14, scale: 4 })
    .notNull()
    .default("100"),
  pierceSec: numeric("pierce_sec", { precision: 8, scale: 4 }).notNull().default("1.2"),
  loadMin: numeric("load_min", { precision: 8, scale: 4 }).notNull().default("1.5"),
  unloadMin: numeric("unload_min", { precision: 8, scale: 4 }).notNull().default("1"),
  durmaSetupMin: numeric("durma_setup_min", { precision: 8, scale: 4 })
    .notNull()
    .default("12"),
  durmaSecPerHit: numeric("durma_sec_per_hit", { precision: 8, scale: 4 })
    .notNull()
    .default("18"),
  pressBendLengthMm: numeric("press_bend_length_mm", { precision: 14, scale: 4 })
    .notNull()
    .default("3050"),
  pressTonnageTon: numeric("press_tonnage_ton", { precision: 14, scale: 4 })
    .notNull()
    .default("220"),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
