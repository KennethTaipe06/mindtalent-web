"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/auth";
import api from "@/lib/api";

interface Test {
  id: string;
  name: string;
  type: string;
  totalQuestions: number;
  timeLimitMin: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const u = getUser();
    if (!u || !["SUPER_ADMIN", "ADMIN", "AUDITOR"].includes(u.role)) {
      router.push("/login");
      return;
    }
    setUser(u);

    api.get("/tests").then((res) => setTests(res.data));
    api.get("/users").then((res) => setUsers(res.data)).catch(() => {});
  }, [router]);

  if (!user) return null;

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
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Cerrar Sesion
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Tests Disponibles</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{tests.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Usuarios Registrados</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{users.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Candidatos</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {users.filter((u) => u.role === "CANDIDATE").length}
            </p>
          </div>
        </div>

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

        {users.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border mt-6">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Usuarios</h2>
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
      </main>
    </div>
  );
}
