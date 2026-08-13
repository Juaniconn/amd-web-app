export default function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-xl font-semibold">Página no encontrada</h1>
      <p className="text-sm text-muted-foreground">
        El recurso solicitado no existe o aún no está habilitado.
      </p>
    </div>
  );
}
