# Dashboard Widgets and Patterns

Patterns discovered while building the AMD Operations ERP (Next.js 16 + Drizzle + PostgreSQL).

## Notification Center

Pattern: Bell icon in header → badge with unread count → slide-out panel with notifications.

```
Header (bell + badge)
    ↓ click
NotificationPanel (slide-out from right)
    ├── Unread count badge
    ├── Notification list (severity-based left border colors)
    ├── Click → navigate to entity
    └── "Mark all read" button
```

**Schema pattern:**
```ts
notifications = pgTable("notifications", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),  // ot_status_changed, part_assigned, etc.
  severity: notificationSeverityEnum("severity"), // info, warning, success, error
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),  // for navigation
  entityId: text("entity_id"),      // for navigation
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("notifications_user_id_idx").on(table.userId),
  index("notifications_created_at_idx").on(table.createdAt.desc()),
]);
```

**API pattern:** Single route handles GET (list) and PATCH (mark read).

**Severity styles (Tailwind):**
- `error`: `border-l-red-500` + `text-red-500`
- `warning`: `border-l-amber-500` + `text-amber-500`
- `success`: `border-l-green-500` + `text-green-500`
- `info`: `border-l-blue-500` + `text-blue-500`

## Global Search

Pattern: Search bar in sidebar → API call → dropdown with categorized results.

**Service pattern:**
```ts
export async function globalSearch(query: string, limit = 10): Promise<SearchResult[]> {
  const q = `%${query.trim()}%`;
  // Parallel queries across entities
  const [customers, quotes, orders, parts] = await Promise.all([...]);
  // Merge and slice
  return results.slice(0, limit);
}
```

**Result type:**
```ts
type SearchResult = {
  kind: "customer" | "quote" | "order" | "part";
  id: string;
  title: string;
  subtitle: string;
};
```

**Navigation:** Build href from entityType + entityId.

## Empty States with CTA

When a list is empty, show message + action button:

```tsx
<EmptyState
  icon={<Users className="h-8 w-8" />}
  title="Aún no hay clientes"
  description="Agrega tu primer cliente para comenzar."
  action={
    <Link href="/customers/new" className={buttonVariants({ variant: "default", size: "sm" })}>
      <Plus className="mr-1 h-3.5 w-3.5" />
      Agregar cliente
    </Link>
  }
/>
```

## AI Assistant Floating Widget

Pattern: Fixed bottom-right button → slide-up chat panel.

```tsx
<button className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600">
  <MessageCircle />
</button>
{open && (
  <Card className="fixed bottom-24 right-6 z-50 h-[500px] w-[380px]">
    {/* Messages + input */}
  </Card>
)}
```

**Context:** Pass current page context to the API so the assistant can give relevant suggestions.

## Skeleton Loaders

```tsx
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 flex-1 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

## Document Management Module

Pattern: Centralized document listing with filters.

**Page:** `/documents`
**Service:** `listDocuments({ entityType, search, limit, offset })`
**Features:** Filter by entity type, search by name, download links.

**File type icons by mimeType:**
- PDF: `text-red-500`
- Image: `text-blue-500`
- Default: `text-muted-foreground`

## Shipping Integration (Skydropx)

Pattern: OAuth2 client credentials → Bearer token → API calls. Cache token in memory until expiry.

**Auth flow:**
```
Client ID + Secret
    ↓ POST /api/v1/oauth/token
Bearer Token (expires in 2 hrs)
    ↓ cache in memory
All API calls: Authorization: Bearer {token}
```

**Architecture:**
```
src/server/services/skydropx-auth.ts   → Token management with in-memory cache
src/server/services/skydropx-client.ts → Fetch wrapper with auto-auth
src/server/services/skydropx.ts        → Business methods (quotations, shipments, tracking)
src/db/schema/skydropx.ts              → Shipment persistence
src/app/api/skydropx/route.ts          → API route handler
src/app/(dashboard)/skydropx/page.tsx  → UI (quotation form, tracking)
```

**Key endpoints:**
| Function | Endpoint |
|---|---|
| Get token | `POST /api/v1/oauth/token` |
| Quotation | `POST /api/v1/quotations` |
| Create shipment | `POST /api/v1/shipments` |
| Track | `GET /api/v1/shipments/tracking/{number}` |
| Cancel | `POST /api/v1/shipments/{id}/cancellations` |
| Labels | `GET /api/v1/orders/{id}/labels` |
| Credits | `GET /api/v1/finance/credits` |

**Schema fields for shipment tracking:**
```ts
skydropxShipments = pgTable("skydropx_shipments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  skydropxId: text("skydropx_id"),
  trackingNumber: text("tracking_number"),
  carrierName: text("carrier_name"),
  status: skydropxShipmentStatusEnum("status"),
  originAddress: jsonb("origin_address"),
  destinationAddress: jsonb("destination_address"),
  packages: jsonb("packages"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }),
  labelUrl: text("label_url"),
  trackingEvents: jsonb("tracking_events"),
  quotationId: text("quotation_id"),
  rateId: text("rate_id"),
}, ...);
```

## UI Audit Workflow

When standardizing UI/UX across many pages, use a script to scan for missing patterns:

```python
# Check each page for: PageHeader, StatRow, EmptyState, semáforos
for page in pages:
    has_page_header = "PageHeader" in content
    has_stat_row = "StatRow" in content or "StatCard" in content
    has_empty_state = "EmptyState" in content
    has_semaforo = "bg-emerald-500" in content or "bg-red-500" in content or "bg-amber-500" in content
```

**Standard upgrade pattern for any page:**
1. Add `PageHeader` with title, description, actions
2. Add `StatRow` with relevant KPIs and semáforo tones
3. Add `EmptyState` with CTA when list is empty
4. Use `buttonVariants({ size: "sm" })` for actions
5. Wrap content in `Card` with `CardHeader` + `CardTitle`

**Semáforo tone mapping:**
- Success/green: `bg-emerald-500` — "terminada", "completado", "entregado", "pagada"
- Error/red: `bg-red-500` — "cancelada", "incidencia", "rechazada"
- Warning/amber: `bg-amber-500` — "pendiente", "en_produccion", "en_revision"

## Subagent Delegation Pitfall

**Problem:** Dispatching multiple subagents for parallel UI work when using rate-limited models (e.g., LongCat free) causes HTTP 429 errors. Subagents each consume API calls from the same quota, leading to truncation before completion.

**Symptom:** Subagents return `status=completed` with `exit_reason=max_iterations` but with zero actual work done — they spent all iterations waiting on API calls that were rate-limited.

**Solution:** For multi-point UI tasks (e.g., "implement 8 features across 20 pages"), implement directly in the main session. One API consumer, full control over error recovery, no wasted iterations on auth/retries.

**Rule of thumb:**
- Use subagents for: isolated, well-scoped tasks with clear inputs/outputs
- Avoid subagents for: broad UI standardization, many parallel pages, rate-limited providers

## TV Dashboard Auto-Refresh

```tsx
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch("/api/production/tv-dashboard");
    if (res.ok) setData(await res.json());
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

**Design:** Fullscreen layout, no sidebar, high contrast, large KPIs, progress bars per OT.
