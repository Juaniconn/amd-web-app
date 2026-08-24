import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-[#0b0d12] px-4">
      {/* Grid de fondo */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
      
      {/* Círculo de luz */}
      <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[100px]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl shadow-blue-500/20">
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AMD Operations</h1>
          <p className="mt-1 text-sm text-gray-500">Plataforma de gestión de manufactura</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-gray-500">Ingresa tus credenciales para continuar</p>
          </div>
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} AMD México · Operations ERP
        </p>
      </div>
    </div>
  );
}
