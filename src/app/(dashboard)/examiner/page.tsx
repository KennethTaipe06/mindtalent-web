"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/auth";
import api from "@/lib/api";

export default function ExaminerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "EXAMINER") {
      router.push("/login");
      return;
    }
    setUser(u);

    const fetchActive = () => {
      api.get("/sessions/active").then((res) => setActiveSessions(res.data)).catch(() => {});
    };
    fetchActive();
    const interval = setInterval(fetchActive, 5000);
    return () => clearInterval(interval);
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">MindTalent - Examinador</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.firstName} {user.lastName}</span>
            <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">
              Cerrar Sesion
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
          <h3 className="text-sm font-medium text-gray-500">Sesiones Activas</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{activeSessions.length}</p>
          <p className="text-sm text-gray-500 mt-1">Se actualiza cada 5 segundos</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Monitor en Vivo</h2>
          </div>
          {activeSessions.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No hay sesiones activas en este momento
            </div>
          ) : (
            <div className="divide-y">
              {activeSessions.map((session: any) => (
                <div key={session.id} className="px-6 py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">
                      {session.candidate?.firstName} {session.candidate?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {session.test?.name} | Pregunta {session.currentQuestion}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm text-green-600">En vivo</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
