"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/auth";
import api from "@/lib/api";
import { getTestPublicName, getTestTypeLabel } from "@/lib/utils";

interface Session {
  id: string;
  testId: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  test?: { name: string };
}

interface ScheduledAssignment {
  id: string;
  status: string;
  startedAt: string | null;
  sessionId: string | null;
  scheduledExam: {
    id: string;
    title: string;
    description: string | null;
    scheduledAt: string;
    durationMin: number;
    status: string;
    test: {
      id: string;
      name: string;
      type: string;
      timeLimitMin: number;
      totalQuestions: number;
    };
    examiner: string;
  };
}

export default function CandidateDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [assignments, setAssignments] = useState<ScheduledAssignment[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(() => {
    api.get("/sessions/my").then((res) => setSessions(res.data)).catch(() => {});
    api.get("/scheduled-exams/my/assigned").then((res) => setAssignments(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "CANDIDATE") {
      router.push("/login");
      return;
    }
    setUser(u);
    fetchData();

    // Refresh every 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [router, fetchData]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const enterScheduledExam = async (scheduledExamId: string) => {
    try {
      const { data } = await api.post(`/scheduled-exams/${scheduledExamId}/enter`);
      showMessage("success", "Ingreso exitoso. Iniciando examen...");
      setTimeout(() => router.push(`/${data.sessionId}`), 500);
    } catch (err: any) {
      showMessage("error", err.response?.data?.message || "Error al ingresar al examen");
    }
  };

  const getTimeStatus = (scheduledAt: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffMin = Math.ceil(diffMs / 60000);
    const earlyAccessMs = 10 * 60 * 1000;

    if (diffMs < 0) {
      return { label: "Hora pasada", canEnter: false, color: "text-red-600", expired: true };
    } else if (diffMs <= earlyAccessMs) {
      return { label: `Disponible ahora (inicia en ${diffMin} min)`, canEnter: true, color: "text-green-600", expired: false };
    } else {
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
      return { label: `Faltan ${timeStr}`, canEnter: false, color: "text-blue-600", expired: false };
    }
  };

  if (!user) return null;

  const pendingAssignments = assignments.filter((a) => a.status === "ASSIGNED" && a.scheduledExam.status !== "CANCELLED");
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");
  const inProgressSessions = sessions.filter((s) => s.status === "IN_PROGRESS");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">MindTalent</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.firstName} {user.lastName}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">CANDIDATO</span>
            <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">Cerrar Sesion</button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {/* Examen en progreso */}
        {inProgressSessions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Examen en Progreso</h2>
            {inProgressSessions.map((session) => (
              <div key={session.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">{getTestPublicName(session.test?.name || "")}</h3>
                  <p className="text-sm text-gray-600">Iniciado: {new Date(session.startedAt).toLocaleString("es-EC")}</p>
                </div>
                <button
                  onClick={() => router.push(`/${session.id}`)}
                  className="bg-yellow-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700"
                >
                  Continuar Examen
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Examenes programados */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Mis Examenes</h2>

        {pendingAssignments.length === 0 && inProgressSessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes examenes asignados</h3>
            <p className="text-sm text-gray-500">
              Cuando un examinador programe un examen para ti, aparecera aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingAssignments.map((assignment) => {
              const exam = assignment.scheduledExam;
              const timeStatus = getTimeStatus(exam.scheduledAt);

              return (
                <div key={assignment.id} className="bg-white rounded-xl shadow-sm border border-indigo-200 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          PROGRAMADO
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {getTestTypeLabel(exam.test.type)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{getTestPublicName(exam.test.name)}</p>
                      {exam.description && (
                        <p className="text-sm text-gray-500 mt-1">{exam.description}</p>
                      )}
                      <div className="flex gap-4 mt-3 text-sm text-gray-500">
                        <span>{exam.test.totalQuestions} preguntas</span>
                        <span>{exam.test.timeLimitMin} min</span>
                        <span>Examinador: {exam.examiner}</span>
                      </div>
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">
                          Fecha y hora: <span className="text-gray-900">{new Date(exam.scheduledAt).toLocaleString("es-EC")}</span>
                        </p>
                        <p className={`text-sm font-medium mt-1 ${timeStatus.color}`}>
                          {timeStatus.label}
                        </p>
                        {!timeStatus.expired && !timeStatus.canEnter && (
                          <p className="text-xs text-gray-400 mt-1">
                            Podras ingresar 10 minutos antes de la hora programada
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {timeStatus.canEnter ? (
                        <button
                          onClick={() => enterScheduledExam(exam.id)}
                          className="bg-green-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-green-700 animate-pulse"
                        >
                          INGRESAR
                        </button>
                      ) : timeStatus.expired ? (
                        <span className="text-xs bg-red-100 text-red-700 px-4 py-2 rounded-lg block text-center">
                          No disponible
                        </span>
                      ) : (
                        <span className="text-xs bg-blue-50 text-blue-600 px-4 py-2 rounded-lg block text-center">
                          Esperar hora
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Historial de examenes completados */}
        {completedSessions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Examenes Completados</h2>
            <div className="bg-white rounded-xl shadow-sm border divide-y">
              {completedSessions.map((session) => (
                <div key={session.id} className="px-6 py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{getTestPublicName(session.test?.name || "Test")}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(session.finishedAt).toLocaleString("es-EC")}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/${session.id}/result`)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                  >
                    Ver Resultado
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
