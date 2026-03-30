"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/auth";
import api from "@/lib/api";

interface Session {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  currentQuestion: number;
  candidate?: { firstName: string; lastName: string; cedula: string };
  test?: { name: string; type: string };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  cedula: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Test {
  id: string;
  name: string;
  type: string;
  totalQuestions: number;
  timeLimitMin: number;
}

export default function AuditorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "sessions">("overview");

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "AUDITOR") {
      router.push("/login");
      return;
    }
    setUser(u);

    api.get("/tests").then((res) => setTests(res.data)).catch(() => {});
    api.get("/users").then((res) => setUsers(res.data)).catch(() => {});
    api.get("/sessions/active").then((res) => setActiveSessions(res.data)).catch(() => {});
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">MindTalent - Auditoria</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              {user.role}
            </span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Cerrar Sesion
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Info banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-purple-700">
            Vista de solo lectura. Como auditor, puedes consultar toda la informacion del sistema sin modificarla.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Tests</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{tests.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Usuarios</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{users.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Candidatos</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {users.filter((u) => u.role === "CANDIDATE").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Sesiones Activas</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{activeSessions.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["overview", "users", "sessions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border"
              }`}
            >
              {tab === "overview" ? "Resumen" : tab === "users" ? "Usuarios" : "Sesiones"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Tests Psicometricos</h2>
            </div>
            <div className="divide-y">
              {tests.map((test) => (
                <div key={test.id} className="px-6 py-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">{test.name}</h3>
                    <p className="text-sm text-gray-500">
                      {test.totalQuestions} preguntas | {test.timeLimitMin} min
                    </p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    {test.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Registro de Usuarios</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cedula</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{u.firstName} {u.lastName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.cedula}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{u.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {u.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Sesiones Activas</h2>
            </div>
            {activeSessions.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No hay sesiones activas en este momento
              </div>
            ) : (
              <div className="divide-y">
                {activeSessions.map((session) => (
                  <div key={session.id} className="px-6 py-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        {session.candidate?.firstName} {session.candidate?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {session.test?.name} | Pregunta {session.currentQuestion} | {session.candidate?.cedula}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-sm text-green-600">{session.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
