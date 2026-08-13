import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[oklch(0.23_0.03_250)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            AMD México
          </p>
          <CardTitle className="text-2xl">AMD Operations</CardTitle>
          <CardDescription>
            Plataforma interna. Inicia sesión para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
