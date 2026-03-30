"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { getTestPublicName } from "@/lib/utils";

interface Question {
  id: string;
  number: number;
  text: string | null;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  options: { index: number; label: string }[] | null;
}

interface TestData {
  id: string;
  name: string;
  type: string;
  questionFormat: string;
  timeLimitMin: number;
  totalQuestions: number;
  instructions: string;
  questions: Question[];
}

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_session, setSession] = useState<any>(null);
  const [test, setTest] = useState<TestData | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionRes = await api.get(`/sessions/${sessionId}/result`).catch(() => null);
        if (sessionRes?.data) {
          router.push(`/${sessionId}/result`);
          return;
        }

        // Load by treating sessionId as session ID - get session info then load test
        const sessionsRes = await api.get("/sessions/my");
        const sess = sessionsRes.data.find((s: any) => s.id === sessionId);
        if (!sess) {
          alert("Sesion no encontrada");
          router.push("/candidate");
          return;
        }
        setSession(sess);

        const testRes = await api.get(`/tests/${sess.testId}/questions`);
        setTest(testRes.data);
        setCurrentIdx(Math.max(0, (sess.currentQuestion || 1) - 1));
        setTimeLeft(testRes.data.timeLimitMin * 60);
      } catch {
        alert("Error al cargar el examen");
        router.push("/candidate");
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [sessionId, router]);

  // Timer
  useEffect(() => {
    if (!test || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-finish when time runs out
          api.post(`/sessions/${sessionId}/finish`).then(() => {
            router.push(`/${sessionId}/result`);
          }).catch(() => {
            alert("Error al finalizar");
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, sessionId, router]);

  const handleAnswer = useCallback(
    async (response: any) => {
      if (!test || submitting) return;
      const question = test.questions[currentIdx];
      setSubmitting(true);
      setStartTime(Date.now());

      const responseTimeMs = Date.now() - startTime;

      try {
        await api.post(`/sessions/${sessionId}/answer`, {
          questionId: question.id,
          questionNumber: question.number,
          response,
          responseTimeMs,
        });

        setAnswers((prev) => ({ ...prev, [question.id]: response }));

        if (currentIdx < test.questions.length - 1) {
          setCurrentIdx((prev) => prev + 1);
          setStartTime(Date.now());
        }
      } catch (err: any) {
        if (err.response?.status !== 409) {
          console.error("Error submitting answer");
        }
        if (currentIdx < test.questions.length - 1) {
          setCurrentIdx((prev) => prev + 1);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [test, currentIdx, sessionId, startTime, submitting],
  );

  const handleFinish = async () => {
    try {
      await api.post(`/sessions/${sessionId}/finish`);
      router.push(`/${sessionId}/result`);
    } catch {
      alert("Error al finalizar");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!test) return null;
  const question = test.questions[currentIdx];
  const isLastQuestion = currentIdx === test.questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="font-bold text-gray-900">{getTestPublicName(test.name)}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {currentIdx + 1} / {test.questions.length}
            </span>
            <span className={`font-mono text-sm font-bold ${timeLeft < 300 ? "text-red-600" : "text-gray-700"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-1 bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / test.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <p className="text-sm text-gray-500 mb-2">Pregunta {question.number}</p>

          {question.text && (
            <h2 className="text-lg font-medium text-gray-900 mb-6">{question.text}</h2>
          )}

          {/* FORCED_CHOICE_PAIR (Kostick / Valanti) */}
          {test.questionFormat === "FORCED_CHOICE_PAIR" && (
            <div className="space-y-3">
              <button
                onClick={() => handleAnswer({ value: "A" })}
                disabled={submitting}
                className="w-full text-left p-4 border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
              >
                <span className="font-bold text-blue-600 mr-3">A</span>
                {question.optionA}
              </button>
              <button
                onClick={() => handleAnswer({ value: "B" })}
                disabled={submitting}
                className="w-full text-left p-4 border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
              >
                <span className="font-bold text-blue-600 mr-3">B</span>
                {question.optionB}
              </button>
            </div>
          )}

          {/* FORCED_CHOICE_GROUP (DISC) */}
          {test.questionFormat === "FORCED_CHOICE_GROUP" && question.options && (
            <DiscQuestion
              options={question.options}
              onAnswer={handleAnswer}
              disabled={submitting}
            />
          )}

          {/* MULTIPLE_CHOICE_ABC (16PF) */}
          {test.questionFormat === "MULTIPLE_CHOICE_ABC" && (
            <div className="space-y-3">
              {["A", "B", "C"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswer({ value: opt })}
                  disabled={submitting}
                  className="w-full text-left p-4 border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <span className="font-bold text-blue-600 mr-3">{opt}</span>
                  {opt === "A" ? question.optionA : opt === "B" ? question.optionB : question.optionC}
                </button>
              ))}
            </div>
          )}

          {/* Finish button on last question */}
          {isLastQuestion && Object.keys(answers).length >= test.questions.length - 1 && (
            <button
              onClick={handleFinish}
              className="mt-6 w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition"
            >
              Finalizar Examen
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

// Componente DISC - seleccionar MAS y MENOS
function DiscQuestion({
  options,
  onAnswer,
  disabled,
}: {
  options: { index: number; label: string }[];
  onAnswer: (response: any) => void;
  disabled: boolean;
}) {
  const [most, setMost] = useState<string | null>(null);
  const [least, setLeast] = useState<string | null>(null);

  const handleSubmit = () => {
    if (most !== null && least !== null) {
      onAnswer({ most, least });
      setMost(null);
      setLeast(null);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Seleccione el adjetivo que <strong>MAS</strong> lo describe y el que <strong>MENOS</strong> lo describe
      </p>

      <div className="space-y-2">
        {options.map((opt) => (
          <div key={opt.index} className="flex items-center gap-3 p-3 border rounded-lg">
            <span className="flex-1 text-gray-900">{opt.label}</span>
            <button
              onClick={() => setMost(String(opt.index))}
              disabled={disabled}
              className={`px-3 py-1 text-xs rounded-full border transition ${
                most === String(opt.index)
                  ? "bg-green-600 text-white border-green-600"
                  : "hover:bg-green-50 border-gray-300"
              }`}
            >
              MAS
            </button>
            <button
              onClick={() => setLeast(String(opt.index))}
              disabled={disabled}
              className={`px-3 py-1 text-xs rounded-full border transition ${
                least === String(opt.index)
                  ? "bg-red-600 text-white border-red-600"
                  : "hover:bg-red-50 border-gray-300"
              }`}
            >
              MENOS
            </button>
          </div>
        ))}
      </div>

      {most !== null && least !== null && most !== least && (
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          Confirmar
        </button>
      )}
    </div>
  );
}
