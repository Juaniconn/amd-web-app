"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { loginSchema } from "@/lib/validation/auth";
import { AlertCircle, Loader2 } from "lucide-react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    setPending(true);
    try {
      const result = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (result.error) {
        setError(
          result.error.message === "Invalid origin"
            ? "Este equipo no está autorizado para iniciar sesión. Revisa la URL de acceso."
            : "Correo o contraseña incorrectos.",
        );
        return;
      }

      window.location.assign("/");
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-300">
          Correo electrónico
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@amd-operations.local"
          className="border-white/5 bg-white/[0.02] text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-300">
          Contraseña
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="border-white/5 bg-white/[0.02] text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20"
        />
      </div>
      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : null}
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ingresando...
          </>
        ) : (
          "Iniciar sesión"
        )}
      </Button>
    </form>
  );
}
