"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/auth";
import api from "@/lib/api";

interface Test {
  id: string;
  name: string;
  type: string;
  description: string;
  totalQuestions: number;
  timeLimitMin: number;
  instructions: string;
}

interface Session {
  id: string;
  testId: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  test?: { name: string };
}

export default function CandidateDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "CANDIDATE") {
      router.push("/login");
      return;
    }
    setUser(u);

    api.get("/tests").then((res) => setTests(res.data));
    api.get("/sessions/my").then((res) => setSessions(res.data)).catch(() => {});
  }, [router]);

  const startTest = async (testId: string) => {
    try {
      const { data } = await api.post("/sessions/start", { testId });
      router.push(`/${data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al iniciar el test");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">MindTalent</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.firstName} {user.lastName}
            </span>
            <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">
              Cerrar Sesion
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Tests Disponibles</h2>

        <div className="grid gap-4">
          {tests.map((test) => {
            const completed = sessions.find(
              (s) => s.testId === test.id && s.status === "COMPLETED"
            );
            const inProgress = sessions.find(
              (s) => s.testId === test.id && s.status === "IN_PROGRESS"
            );

            return (
              <div key={test.id} className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{test.description}</p>
                    <div className="flex gap-4 mt-3 text-sm text-gray-500">
                      <span>{test.totalQuestions} preguntas</span>
                      <span>{test.timeLimitMin} minutos</span>
                    </div>
                  </div>
                  <div>
                    {completed ? (
                      <button
                        onClick={() => router.push(`/${completed.id}/result`)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                      >
                        Ver Resultado
                      </button>
                    ) : inProgress ? (
                      <button
                        onClick={() => router.push(`/${inProgress.id}`)}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700"
                      >
                        Continuar
                      </button>
                    ) : (
                      <button
                        onClick={() => startTest(test.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                      >
                        Iniciar Test
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sessions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Sesiones</h2>
            <div className="bg-white rounded-xl shadow-sm border divide-y">
              {sessions.map((session) => (
                <div key={session.id} className="px-6 py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{session.test?.name || session.testId}</p>
                    <p className="text-sm text-gray-500">
                      {session.startedAt ? new Date(session.startedAt).toLocaleString("es-EC") : "No iniciado"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      session.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : session.status === "IN_PROGRESS"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {session.status === "COMPLETED" ? "Completado" : session.status === "IN_PROGRESS" ? "En Progreso" : session.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
