"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">No se pudo cargar la pantalla</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Ocurrió un error interno. El detalle técnico no se muestra aquí.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border px-3 py-2 text-sm"
      >
        Reintentar
      </button>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">Ref: {error.digest}</p>
      ) : null}
    </div>
  );
}
