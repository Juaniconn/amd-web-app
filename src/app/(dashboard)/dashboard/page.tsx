export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Bienvenido a AMD Operations</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Órdenes</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Productos</p>
          <p className="text-2xl font-bold">32</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Proveedores</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Proyectos</p>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>
    </div>
  );
}
