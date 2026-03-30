"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/auth";
import api from "@/lib/api";

interface Test {
  id: string;
  name: string;
  type: string;
  timeLimitMin: number;
  totalQuestions: number;
}

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  cedula: string;
  email: string;
}

interface ScheduledExamCandidate {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  sessionId: string | null;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    cedula: string;
    email: string;
  };
}

interface ScheduledExam {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  durationMin: number;
  status: string;
  test: { id: string; name: string; type: string; timeLimitMin: number };
  examiner: { id: string; name: string };
  candidates: ScheduledExamCandidate[];
  totalCandidates: number;
  startedCount: number;
  completedCount: number;
  absentCount: number;
}

type ActiveTab = "scheduled" | "create" | "active";

export default function ExaminerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; firstName: string; lastName: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("scheduled");
  const [scheduledExams, setScheduledExams] = useState<ScheduledExam[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ScheduledExam | null>(null);

  // Form state
  const [form, setForm] = useState({
    testId: "",
    title: "",
    description: "",
    scheduledAt: "",
    durationMin: 60,
    candidateIds: [] as string[],
  });

  const fetchData = useCallback(() => {
    api.get("/scheduled-exams").then((res) => setScheduledExams(res.data)).catch(() => {});
    api.get("/sessions/active").then((res) => setActiveSessions(res.data)).catch(() => {});
    api.get("/tests").then((res) => setTests(res.data)).catch(() => {});
    api.get("/users?role=CANDIDATE").then((res) => setCandidates(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const u = getUser();
    if (!u || !["SUPER_ADMIN", "ADMIN", "EXAMINER"].includes(u.role)) {
      router.push("/login");
      return;
    }
    setUser(u);
    fetchData();

    // Refresh active sessions every 5s
    const interval = setInterval(() => {
      api.get("/sessions/active").then((res) => setActiveSessions(res.data)).catch(() => {});
      api.get("/scheduled-exams").then((res) => setScheduledExams(res.data)).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [router, fetchData]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleToggleCandidate = (candidateId: string) => {
    setForm((prev) => ({
      ...prev,
      candidateIds: prev.candidateIds.includes(candidateId)
        ? prev.candidateIds.filter((id) => id !== candidateId)
        : [...prev.candidateIds, candidateId],
    }));
  };

  const handleSelectAll = () => {
    if (form.candidateIds.length === candidates.length) {
      setForm((prev) => ({ ...prev, candidateIds: [] }));
    } else {
      setForm((prev) => ({ ...prev, candidateIds: candidates.map((c) => c.id) }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.candidateIds.length === 0) {
      showMessage("error", "Debes seleccionar al menos un candidato");
      return;
    }
    setLoading(true);
    try {
      await api.post("/scheduled-exams", form);
      showMessage("success", "Examen programado exitosamente");
      setForm({ testId: "", title: "", description: "", scheduledAt: "", durationMin: 60, candidateIds: [] });
      setActiveTab("scheduled");
      fetchData();
    } catch (err: any) {
      showMessage("error", err.response?.data?.message || "Error al programar el examen");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (examId: string) => {
    if (!confirm("¿Estas seguro de cancelar este examen?")) return;
    try {
      await api.patch(`/scheduled-exams/${examId}/cancel`);
      showMessage("success", "Examen cancelado");
      fetchData();
    } catch {
      showMessage("error", "Error al cancelar");
    }
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    ACTIVE: "bg-green-100 text-green-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-gray-100 text-gray-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  const candidateStatusColors: Record<string, string> = {
    ASSIGNED: "bg-blue-100 text-blue-700",
    STARTED: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-green-100 text-green-700",
    ABSENT: "bg-red-100 text-red-700",
  };

  const statusLabels: Record<string, string> = {
    SCHEDULED: "Programado",
    ACTIVE: "Activo",
    IN_PROGRESS: "En Progreso",
    COMPLETED: "Completado",
    CANCELLED: "Cancelado",
    ASSIGNED: "Asignado",
    STARTED: "En Examen",
    ABSENT: "Ausente",
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">MindTalent - Examinador</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.firstName} {user.lastName}</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{user.role}</span>
            <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">Cerrar Sesion</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Examenes Programados</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {scheduledExams.filter((e) => e.status === "SCHEDULED").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Sesiones Activas Ahora</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{activeSessions.length}</p>
            <p className="text-xs text-gray-500 mt-1">Se actualiza cada 5s</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Candidatos Registrados</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{candidates.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { key: "scheduled", label: "Examenes Programados" },
            { key: "create", label: "+ Programar Examen" },
            { key: "active", label: "Monitor en Vivo" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSelectedDetail(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ========== SCHEDULED EXAMS ========== */}
        {activeTab === "scheduled" && !selectedDetail && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Examenes Programados</h2>
            </div>
            {scheduledExams.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No hay examenes programados. Usa &quot;+ Programar Examen&quot; para crear uno.
              </div>
            ) : (
              <div className="divide-y">
                {scheduledExams.map((exam) => (
                  <div key={exam.id} className="px-6 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{exam.title}</h3>
                        <p className="text-sm text-gray-500">
                          {exam.test.name} | {new Date(exam.scheduledAt).toLocaleString("es-EC")}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {exam.totalCandidates} candidatos | {exam.startedCount} ingresaron | {exam.completedCount} completaron | {exam.absentCount} ausentes
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full ${statusColors[exam.status] || "bg-gray-100"}`}>
                          {statusLabels[exam.status] || exam.status}
                        </span>
                        <button
                          onClick={() => setSelectedDetail(exam)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1"
                        >
                          Ver Detalle
                        </button>
                        {exam.status === "SCHEDULED" && (
                          <button
                            onClick={() => handleCancel(exam.id)}
                            className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== EXAM DETAIL ========== */}
        {activeTab === "scheduled" && selectedDetail && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedDetail.title}</h2>
                <p className="text-sm text-gray-500">
                  {selectedDetail.test.name} | {new Date(selectedDetail.scheduledAt).toLocaleString("es-EC")}
                </p>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Volver
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Candidatos Asignados</h3>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Candidato</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cedula</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ingreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedDetail.candidates.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {c.candidate.firstName} {c.candidate.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.candidate.cedula}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${candidateStatusColors[c.status] || "bg-gray-100"}`}>
                          {statusLabels[c.status] || c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {c.startedAt ? new Date(c.startedAt).toLocaleTimeString("es-EC") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========== CREATE SCHEDULED EXAM ========== */}
        {activeTab === "create" && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Programar Nuevo Examen</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titulo</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Ej: Evaluacion Kostick - Grupo A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test</label>
                  <select
                    value={form.testId}
                    onChange={(e) => setForm({ ...form, testId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Seleccionar test...</option>
                    {tests.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.totalQuestions} preguntas, {t.timeLimitMin} min)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora de Inicio</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Los candidatos podran ingresar 10 min antes. Despues de esta hora seran marcados como AUSENTES.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duracion ventana (min)</label>
                  <input
                    type="number"
                    value={form.durationMin}
                    onChange={(e) => setForm({ ...form, durationMin: parseInt(e.target.value) || 60 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    min={1}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion (opcional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  rows={2}
                />
              </div>

              {/* Candidates selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Candidatos ({form.candidateIds.length} seleccionados)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    {form.candidateIds.length === candidates.length ? "Deseleccionar todos" : "Seleccionar todos"}
                  </button>
                </div>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {candidates.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500">No hay candidatos registrados</p>
                  ) : (
                    candidates.map((c) => (
                      <label
                        key={c.id}
                        className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                          form.candidateIds.includes(c.id) ? "bg-indigo-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.candidateIds.includes(c.id)}
                          onChange={() => handleToggleCandidate(c.id)}
                          className="mr-3 h-4 w-4 text-indigo-600 rounded"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">{c.cedula}</span>
                          <span className="text-xs text-gray-400 ml-2">{c.email}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? "Programando..." : "Programar Examen"}
              </button>
            </form>
          </div>
        )}

        {/* ========== ACTIVE MONITOR ========== */}
        {activeTab === "active" && (
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
        )}
      </main>
    </div>
  );
}
