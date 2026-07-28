"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/auth";
import api from "@/lib/api";

interface Test {
  id: string;
  name: string;
  type: string;
  questionFormat: string;
  totalQuestions: number;
  timeLimitMin: number;
  isActive: boolean;
}

interface User {
  id: string;
  email: string;
  cedula: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

type ActiveTab = "tests" | "users" | "create-test" | "create-user";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; firstName: string; lastName: string; role: string } | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("tests");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", role: "" });

  // Create test form
  const [testForm, setTestForm] = useState({
    name: "",
    description: "",
    type: "KOSTICK",
    questionFormat: "FORCED_CHOICE_PAIR",
    timeLimitMin: 30,
    totalQuestions: 90,
    instructions: "",
  });

  // Create user form
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    cedula: "",
    firstName: "",
    lastName: "",
    role: "EXAMINER",
  });

  const fetchData = useCallback(() => {
    api.get("/tests").then((res) => setTests(res.data)).catch(() => {});
    api.get("/users").then((res) => setUsers(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const u = getUser();
    if (!u || !["SUPER_ADMIN", "ADMIN"].includes(u.role)) {
      router.push("/login");
      return;
    }
    setUser(u);
    fetchData();
  }, [router, fetchData]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/tests", testForm);
      showMessage("success", "Test creado exitosamente");
      setTestForm({ name: "", description: "", type: "KOSTICK", questionFormat: "FORCED_CHOICE_PAIR", timeLimitMin: 30, totalQuestions: 90, instructions: "" });
      setActiveTab("tests");
      fetchData();
    } catch {
      showMessage("error", "Error al crear el test");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTest = async (testId: string, isActive: boolean) => {
    try {
      await api.put(`/tests/${testId}`, { isActive: !isActive });
      showMessage("success", isActive ? "Test desactivado" : "Test activado");
      fetchData();
    } catch {
      showMessage("error", "Error al actualizar el test");
    }
  };

  const handleToggleUser = async (userId: string, isActive: boolean) => {
    try {
      await api.patch(`/users/${userId}/status`, { isActive: !isActive });
      showMessage("success", isActive ? "Usuario desactivado" : "Usuario activado");
      fetchData();
    } catch {
      showMessage("error", "Error al actualizar el usuario");
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    try {
      await api.put(`/users/${userId}`, { role });
      showMessage("success", "Rol actualizado");
      fetchData();
    } catch {
      showMessage("error", "Error al cambiar el rol");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/users", userForm);
      showMessage("success", "Usuario creado exitosamente");
      setUserForm({ email: "", password: "", cedula: "", firstName: "", lastName: "", role: "EXAMINER" });
      setActiveTab("users");
      fetchData();
    } catch (err: any) {
      showMessage("error", err.response?.data?.message || "Error al crear el usuario");
    } finally {
      setLoading(false);
    }
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setEditForm({ firstName: u.firstName, lastName: u.lastName, role: u.role });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.put(`/users/${editingUser.id}`, editForm);
      showMessage("success", "Usuario actualizado");
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      showMessage("error", err.response?.data?.message || "Error al actualizar el usuario");
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!confirm(`¿Eliminar a ${u.firstName} ${u.lastName}? Esta accion no se puede deshacer.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      showMessage("success", "Usuario eliminado");
      fetchData();
    } catch (err: any) {
      showMessage("error", err.response?.data?.message || "Error al eliminar el usuario");
    }
  };

  if (!user) return null;

  const testTypeMap: Record<string, string> = {
    KOSTICK: "FORCED_CHOICE_PAIR",
    VALANTI: "FORCED_CHOICE_PAIR",
    DISC: "FORCED_CHOICE_GROUP",
    PF16: "MULTIPLE_CHOICE_ABC",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">MindTalent - Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {user.role}
            </span>
            <button
              onClick={() => router.push("/examiner")}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Panel Examinador
            </button>
            <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">
              Cerrar Sesion
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Message toast */}
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {message.text}
          </div>
        )}

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
            <h3 className="text-sm font-medium text-gray-500">Examinadores</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {users.filter((u) => u.role === "EXAMINER").length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("tests")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "tests" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border"}`}
          >
            Tests Psicometricos
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "users" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border"}`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab("create-test")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "create-test" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border"}`}
          >
            + Crear Test
          </button>
          {user.role === "SUPER_ADMIN" && (
            <button
              onClick={() => setActiveTab("create-user")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "create-user" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border"}`}
            >
              + Crear Usuario
            </button>
          )}
        </div>

        {/* Tests Tab */}
        {activeTab === "tests" && (
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
                      {test.totalQuestions} preguntas | {test.timeLimitMin} min | {test.questionFormat}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      {test.type}
                    </span>
                    <button
                      onClick={() => handleToggleTest(test.id, test.isActive)}
                      className={`text-xs px-3 py-1 rounded-full font-medium ${test.isActive ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                    >
                      {test.isActive ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              ))}
              {tests.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500">
                  No hay tests creados. Usa la pestana &quot;+ Crear Test&quot; para agregar uno.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Gestion de Usuarios</h2>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{u.firstName} {u.lastName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.cedula}</td>
                      <td className="px-6 py-4">
                        {user.role === "SUPER_ADMIN" ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className="text-xs border rounded px-2 py-1 bg-white"
                          >
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="EXAMINER">EXAMINER</option>
                            <option value="CANDIDATE">CANDIDATE</option>
                            <option value="AUDITOR">AUDITOR</option>
                          </select>
                        ) : (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{u.role}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {u.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === "SUPER_ADMIN" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditUser(u)}
                              className="text-xs px-3 py-1 rounded font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                            >
                              Editar
                            </button>
                            {u.id !== user.id && (
                              <>
                                <button
                                  onClick={() => handleToggleUser(u.id, u.isActive)}
                                  className={`text-xs px-3 py-1 rounded font-medium ${u.isActive ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                                >
                                  {u.isActive ? "Desactivar" : "Activar"}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="text-xs px-3 py-1 rounded font-medium bg-red-600 text-white hover:bg-red-700"
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Test Tab */}
        {activeTab === "create-test" && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Crear Nuevo Test</h2>
            </div>
            <form onSubmit={handleCreateTest} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Test</label>
                  <input
                    type="text"
                    value={testForm.name}
                    onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ej: Kostick (PAPI)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Test</label>
                  <select
                    value={testForm.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      setTestForm({
                        ...testForm,
                        type,
                        questionFormat: testTypeMap[type] || "FORCED_CHOICE_PAIR",
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="KOSTICK">Kostick (PAPI)</option>
                    <option value="VALANTI">Valanti</option>
                    <option value="DISC">DISC</option>
                    <option value="PF16">16PF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formato de Preguntas</label>
                  <select
                    value={testForm.questionFormat}
                    onChange={(e) => setTestForm({ ...testForm, questionFormat: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="FORCED_CHOICE_PAIR">Eleccion Forzada (Par)</option>
                    <option value="FORCED_CHOICE_GROUP">Eleccion Forzada (Grupo)</option>
                    <option value="MULTIPLE_CHOICE_ABC">Opcion Multiple (ABC)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo Limite (min)</label>
                  <input
                    type="number"
                    value={testForm.timeLimitMin}
                    onChange={(e) => setTestForm({ ...testForm, timeLimitMin: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total de Preguntas</label>
                  <input
                    type="number"
                    value={testForm.totalQuestions}
                    onChange={(e) => setTestForm({ ...testForm, totalQuestions: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    min={1}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                <textarea
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows={2}
                  placeholder="Descripcion del test..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones</label>
                <textarea
                  value={testForm.instructions}
                  onChange={(e) => setTestForm({ ...testForm, instructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows={3}
                  placeholder="Instrucciones que vera el candidato antes de iniciar..."
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear Test"}
              </button>
            </form>
          </div>
        )}

        {/* Create User Tab */}
        {activeTab === "create-user" && user.role === "SUPER_ADMIN" && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Crear Nuevo Usuario</h2>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cedula</label>
                  <input
                    type="text"
                    value={userForm.cedula}
                    onChange={(e) => setUserForm({ ...userForm, cedula: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="EXAMINER">EXAMINER</option>
                    <option value="CANDIDATE">CANDIDATE</option>
                    <option value="AUDITOR">AUDITOR</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear Usuario"}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Editar Usuario</h3>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="EXAMINER">EXAMINER</option>
                  <option value="CANDIDATE">CANDIDATE</option>
                  <option value="AUDITOR">AUDITOR</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
