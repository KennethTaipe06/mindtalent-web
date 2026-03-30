"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api, { downloadExcel } from "@/lib/api";

interface ScaleResult {
  rawScore: number;
  percentile: number | null;
  stenScore: number | null;
  category: string;
  scale: {
    code: string;
    name: string;
    maxScore: number;
  };
}

interface Result {
  id: string;
  totalScore: number;
  rawData: Record<string, number>;
  scaleResults: ScaleResult[];
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/sessions/${sessionId}/result`)
      .then((res) => setResult(res.data))
      .catch(() => alert("No se encontraron resultados"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No hay resultados disponibles</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Resultados de la Evaluacion</h1>
          <div className="flex gap-3">
            <button
              onClick={() => downloadExcel(`/reports/session/${sessionId}`, `resultado_${sessionId}.xlsx`)}
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Descargar Excel
            </button>
            <button
              onClick={() => router.push("/candidate")}
              className="text-sm text-blue-600 hover:text-blue-800 py-2"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Resumen */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h2>
          <p className="text-sm text-gray-600">
            Puntaje total: <span className="font-bold text-gray-900">{result.totalScore}</span>
          </p>
        </div>

        {/* Resultados por escala */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resultados por Escala</h2>
          <div className="space-y-4">
            {result.scaleResults
              ?.sort((a, b) => a.scale.code.localeCompare(b.scale.code))
              .map((sr) => {
                const percentage = sr.scale.maxScore > 0
                  ? (sr.rawScore / sr.scale.maxScore) * 100
                  : 0;

                return (
                  <div key={sr.scale.code}>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="font-mono text-sm font-bold text-blue-600 mr-2">
                          {sr.scale.code}
                        </span>
                        <span className="text-sm text-gray-700">{sr.scale.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">
                          {sr.rawScore} / {sr.scale.maxScore}
                        </span>
                        {sr.stenScore && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            STEN: {sr.stenScore}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            sr.category === "Alto"
                              ? "bg-green-100 text-green-700"
                              : sr.category === "Medio"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {sr.category}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          sr.category === "Alto"
                            ? "bg-green-500"
                            : sr.category === "Medio"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.max(2, Math.min(100, percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </main>
    </div>
  );
}
