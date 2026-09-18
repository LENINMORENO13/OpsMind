import { GoogleGenAI, Type } from "@google/genai";
import prisma from "../lib/prisma.js";
import { CriticalityLevel } from "@prisma/client";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Detecta saturación de Gemini inspeccionando propiedades reales del error
// (status/code/response.status/message) en lugar de serializar el objeto Error,
// ya que JSON.stringify(new Error(...)) produce "{}".
const RETRYABLE_SIGNALS = [
  "429",
  "503",
  "RESOURCE_EXHAUSTED",
  "UNAVAILABLE",
  "RATE_LIMIT",
];

const isRetryableGeminiError = (error: unknown): boolean => {
  if (error === null || error === undefined) return false;

  const err = error as {
    status?: unknown;
    code?: unknown;
    message?: unknown;
    response?: { status?: unknown };
  };

  const haystack = [
    err.status,
    err.code,
    err.response?.status,
    err.message,
  ]
    .filter((part) => part !== undefined && part !== null)
    .map((part) => String(part))
    .join(" ")
    .toUpperCase();

  return RETRYABLE_SIGNALS.some((signal) => haystack.includes(signal));
};

const getRetryDelayMs = (): number => {
  const parsed = Number(process.env.GEMINI_RETRY_DELAY_MS ?? 10000);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 10000;
};

export interface AIDiagnosis {
  causa_probable: string;
  accion_recomendada: string;
  nivel_criticidad: CriticalityLevel;
  historicalAnalysis: string;
}

export const analyzeIncident = async (
  monitorName: string,
  url: string,
  errorDetails: string,
  retries: number = 3,
  historicalContext?: string,
): Promise<AIDiagnosis> => {
  // 1. Inicialización con el nuevo SDK oficial de Google
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  try {
    const prompt = `
      Eres un Ingeniero Site Reliability (SRE) Senior diagnosticando una alerta de monitoreo.
      Un servicio de nuestra infraestructura acaba de reportar una caída o degradación.

      --- INCIDENTE ACTUAL ---
      Analiza principalmente este incidente:
      - Servicio: ${monitorName}
      - URL: ${url}
      - Error / Excepción: ${errorDetails}

      --- INCIDENTES HISTÓRICOS (CONTEXTO) ---
      ${historicalContext ?? "No existen incidentes históricos disponibles. Basa el diagnóstico en el incidente actual y conocimiento general de infraestructura."}

      --- REGLAS ---
      1. El incidente actual es la fuente principal del diagnóstico.
      2. Usa los históricos solo si aportan evidencia relevante al incidente actual.
      3. Compartir únicamente el mismo código o mensaje de error NO implica que exista una causa o patrón recurrente.
      4. No inventes información ni IDs de incidentes.
      5. No menciones históricos que no aporten información útil.

      --- historicalAnalysis ---
      Indica de dónde proviene el diagnóstico:
      - Si un histórico fue relevante, menciona su ID y qué información aportó.
      - Si varios fueron relevantes, menciona sus IDs y la relación encontrada.
      - Si ninguno fue relevante, indica que el diagnóstico se basa en el incidente actual y conocimiento general de infraestructura.
      - Evita frases vagas como "es un patrón recurrente" sin indicar qué incidentes lo sustentan.

      Realiza un diagnóstico técnico, claro y conciso.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        // 2. Fuerza respuesta en JSON nativo usando un esquema estricto para asegurar compatibilidad con Prisma
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            causa_probable: {
              type: Type.STRING,
              description:
                "Explicación técnica de 1 o 2 líneas sobre por qué ocurre este error.",
            },
            accion_recomendada: {
              type: Type.STRING,
              description:
                "El comando, log o servicio exacto que el equipo debe revisar primero para solucionarlo.",
            },
            nivel_criticidad: {
              type: Type.STRING,
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
              description:
                "LOW: Impacto menor sin afectar funciones importantes. " +
                "MEDIUM: Degradación o fallo parcial con impacto limitado. " +
                "HIGH: Fallo o degradación significativa de una función importante. " +
                "CRITICAL: Servicio completamente caído, dependencia crítica no disponible " +
                "o impacto generalizado. Un error 500 puede ser crítico, pero no es requisito.",
            },
            historicalAnalysis: {
              type: Type.STRING,
              description:
                "Indica de forma explícita el origen del diagnóstico. Si utilizaste uno o más incidentes históricos, menciona sus IDs y explica brevemente qué información del incidente anterior fue relevante. Si ningún incidente histórico aportó información relevante, indica que el diagnóstico se basa en el incidente actual y conocimiento general de infraestructura. No afirmes que existe un patrón recurrente sin mencionar los incidentes que lo sustentan.",
            },
          },
          required: [
            "causa_probable",
            "accion_recomendada",
            "nivel_criticidad",
            "historicalAnalysis",
          ],
        },
      },
    });

    // 3. El output viene limpio de Markdown gracias al MimeType, permitiendo un parseo directo y seguro
    return JSON.parse(response.text!) as AIDiagnosis;
  } catch (error) {
    // 4. Estrategia de resiliencia: captura códigos de saturación (429/503) para aplicar reintentos recursivos
    const err = error as Error;
    const isRetryable = isRetryableGeminiError(error);

    if (isRetryable && retries > 0) {
      const retryDelayMs = getRetryDelayMs();
      console.warn(
        `Gemini saturado o no disponible (Código detectado). Reintentando en ${retryDelayMs}ms... (${retries} intentos restantes)`,
      );
      await delay(retryDelayMs);
      return analyzeIncident(
        monitorName,
        url,
        errorDetails,
        retries - 1,
        historicalContext,
      );
    }

    console.error("Error interno en aiService:", err.message || error);
    return {
      causa_probable: "Análisis de IA no disponible temporalmente.",
      accion_recomendada: "Revisar los logs del contenedor manualmente.",
      nivel_criticidad: CriticalityLevel.CRITICAL,
      historicalAnalysis:
        "No disponible debido a fallo temporal en el servicio de IA",
    };
  }
};

export const processIncidentInsight = async (payload: {
  incidentId: number;
  monitorId: number;
  name: string;
  url: string;
  errorDetails: string;
  historicalContext?: string;
}) => {
  const aiDiagnosis = await analyzeIncident(
    payload.name,
    payload.url,
    payload.errorDetails,
    3,
    payload.historicalContext,
  );

  await prisma.aIInsight.create({
    data: {
      incidentId: payload.incidentId,
      analysis: aiDiagnosis.causa_probable,
      suggestion: aiDiagnosis.accion_recomendada,
      criticality: aiDiagnosis.nivel_criticidad,
      historicalAnalysis: aiDiagnosis.historicalAnalysis,
    },
  });
  console.log(`Insight guardado exitosamente para el monitor ${payload.name}`);
};
