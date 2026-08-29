"use client";

import { useEffect, useState } from "react";
import { TvDashboardView, type TvDashboard } from "@/features/production/tv-dashboard";

export default function TvPage() {
  const [data, setData] = useState<TvDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/production/tv-dashboard");
        if (!res.ok) throw new Error("Error al cargar dashboard");
        const json = await res.json();
        if (active) setData(json);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Error desconocido");
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0d12] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl font-bold">Error al cargar el dashboard</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0b0d12] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl font-bold">Cargando Centro de Operaciones...</p>
        </div>
      </div>
    );
  }

  return <TvDashboardView initialData={data} />;
}