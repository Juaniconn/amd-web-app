"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { loginSchema } from "@/lib/validation/auth";
import { AlertCircle, Loader2, Eye, EyeOff, Sparkles, Shield, Zap } from "lucide-react";

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-[80px]"
          style={{
            background: i % 2 === 0 ? "rgba(59,130,246,0.08)" : "rgba(139,92,246,0.06)",
            width: `${150 + i * 60}px`,
            height: `${150 + i * 60}px`,
          }}
          animate={{
            x: [0, 30 + i * 10, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 15 + i * 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          initial={{
            left: `${10 + i * 20}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
        />
      ))}
    </div>
  );
}

function GridBackground() {
  return (
    <div className="absolute inset-0 opacity-[0.03]">
      <div
        className="h-full w-full"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
            ? "Este equipo no está autorizado para iniciar sesión."
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  return (
    <motion.form
      action={onSubmit}
      className="space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="space-y-2">
        <Label
          htmlFor="email"
          className={`text-sm font-medium transition-colors duration-200 ${
            focusedField === "email" ? "text-blue-400" : "text-gray-400"
          }`}
        >
          Correo electrónico
        </Label>
        <div className="relative">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="admin@amd-operations.local"
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
            className={`h-11 border-white/10 bg-white/[0.03] text-white placeholder:text-gray-600 transition-all duration-300 focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/20 ${
              focusedField === "email" ? "border-blue-500/50 shadow-lg shadow-blue-500/5" : ""
            }`}
          />
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500"
            initial={{ width: "0%" }}
            animate={{ width: focusedField === "email" ? "100%" : "0%" }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-2">
        <Label
          htmlFor="password"
          className={`text-sm font-medium transition-colors duration-200 ${
            focusedField === "password" ? "text-blue-400" : "text-gray-400"
          }`}
        >
          Contraseña
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={8}
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            className={`h-11 border-white/10 bg-white/[0.03] pr-10 text-white placeholder:text-gray-600 transition-all duration-300 focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/20 ${
              focusedField === "password" ? "border-blue-500/50 shadow-lg shadow-blue-500/5" : ""
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500"
            initial={{ width: "0%" }}
            animate={{ width: focusedField === "password" ? "100%" : "0%" }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants}>
        <Button
          type="submit"
          className="relative h-11 w-full overflow-hidden bg-gradient-to-r from-blue-600 to-violet-600 font-medium text-white shadow-xl shadow-blue-500/20 transition-all duration-300 hover:from-blue-500 hover:to-violet-500 hover:shadow-2xl hover:shadow-blue-500/30 disabled:opacity-50"
          disabled={pending}
        >
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          {pending ? (
            <span className="relative flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ingresando...
            </span>
          ) : (
            <span className="relative flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              Iniciar sesión
            </span>
          )}
        </Button>
      </motion.div>
    </motion.form>
  );
}

export default function LoginPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08090d] px-4">
      <FloatingOrbs />
      <GridBackground />

      {/* Radial glow */}
      <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[120px]" />

      <motion.div
        className="relative w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="mb-10 flex flex-col items-center">
          <motion.div
            className="relative mb-6"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 opacity-20 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl shadow-blue-500/30">
              <svg
                className="h-10 w-10 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-white">AMD Operations</h1>
          <p className="mt-2 text-sm text-gray-500">Plataforma de gestión de manufactura</p>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl shadow-black/30 backdrop-blur-xl"
        >
          {/* Card glow */}
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-blue-500/10 blur-[60px]" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-violet-500/10 blur-[60px]" />

          <div className="relative">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">Bienvenido</h2>
              <p className="mt-1 text-sm text-gray-500">Ingresa tus credenciales para continuar</p>
            </div>

            <LoginForm />
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          variants={itemVariants}
          className="mt-8 flex items-center justify-center gap-6"
        >
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Shield className="h-3.5 w-3.5 text-blue-500/70" />
            <span>Seguro</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Zap className="h-3.5 w-3.5 text-violet-500/70" />
            <span>Rápido</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Sparkles className="h-3.5 w-3.5 text-blue-500/70" />
            <span>Premium</span>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          variants={itemVariants}
          className="mt-8 text-center text-xs text-gray-600"
        >
          © {new Date().getFullYear()} AMD México · Operations ERP
        </motion.p>
      </motion.div>
    </div>
  );
}
