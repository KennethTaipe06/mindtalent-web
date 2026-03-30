import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Mapeo de nombres internos a nombres publicos (derechos de autor)
const testTypeLabels: Record<string, string> = {
  KOSTICK: "Intereses Laborales",
  VALANTI: "Personalidad General",
  DISC: "Estilo de Comportamiento",
  PF16: "Rasgos de Personalidad",
};

const testNameMap: Record<string, string> = {
  "Kostick (PAPI)": "Evaluacion de Intereses Laborales",
  "Kostick": "Evaluacion de Intereses Laborales",
  "Valanti": "Evaluacion de Personalidad General",
  "DISC": "Evaluacion de Estilo de Comportamiento",
  "16PF (Forma A)": "Evaluacion de Rasgos de Personalidad",
  "16PF Forma A": "Evaluacion de Rasgos de Personalidad",
  "16PF": "Evaluacion de Rasgos de Personalidad",
};

/** Convierte el tipo interno del test a nombre publico */
export function getTestTypeLabel(type: string): string {
  return testTypeLabels[type] || type;
}

/** Convierte el nombre interno del test a nombre publico */
export function getTestPublicName(name: string): string {
  return testNameMap[name] || name;
}
