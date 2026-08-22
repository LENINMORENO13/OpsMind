import { GoogleGenAI, Type } from "@google/genai";
import prisma from "../lib/prisma.js";
import { CriticalityLevel } from "@prisma/client";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AIDiagnosis {
  causa_probable: string;
  accion_recomendada: string;
  nivel_criticidad: CriticalityLevel;
}

export const analyzeIncident = async (
  monitorName: string,
  url: string,
  errorDetails: string,
  retries: number = 3,
): Promise<AIDiagnosis> => {
  // 1. Inicialización con el nuevo SDK oficial de Google
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  try {
    const prompt = `
      Eres un Ingeniero Site Reliability (SRE) Senior diagnosticando una alerta de monitoreo.
      Un servicio crítico de nuestra infraestructura acaba de reportar una caída o degradación.
      
      Detalles del Incidente:
      - Nombre del Servicio: ${monitorName}
      - URL: ${url}
      - Detalles del Error / Excepción: ${errorDetails}
      
      Analiza la posible causa de este error y estructura tu diagnóstico de forma técnica y precisa.
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
                "LOW: Alertas menores. MEDIUM: Degradación leve. HIGH: Timeouts o lentitud grave. CRITICAL: Caída total o Error 500.",
            },
          },
          required: [
            "causa_probable",
            "accion_recomendada",
            "nivel_criticidad",
          ],
        },
      },
    });

    // 3. El output viene limpio de Markdown gracias al MimeType, permitiendo un parseo directo y seguro
    return JSON.parse(response.text!) as AIDiagnosis;
  } catch (error) {
    // 4. Estrategia de resiliencia: captura códigos de saturación (429/503) para aplicar reintentos recursivos
    const err = error as Error;
    const errorString = JSON.stringify(error) || err.message || "";
    const isRetryable =
      errorString.includes("503") ||
      errorString.includes("UNAVAILABLE") ||
      errorString.includes("429") ||
      errorString.includes("RESOURCE_EXHAUSTED");

    if (isRetryable && retries > 0) {
      console.warn(
        `Gemini saturado o no disponible (Código detectado). Reintentando en 10s... (${retries} intentos restantes)`,
      );
      await delay(10000);
      return analyzeIncident(monitorName, url, errorDetails, retries - 1);
    }

    console.error("Error interno en aiService:", err.message || error);
    return {
      causa_probable: "Análisis de IA no disponible temporalmente.",
      accion_recomendada: "Revisar los logs del contenedor manualmente.",
      nivel_criticidad: CriticalityLevel.CRITICAL,
    };
  }
};

export const processIncidentInsight = async (payload: {
  incidentId: number;
  monitorId: number;
  name: string;
  url: string;
  errorDetails: string;
}) => {
  const aiDiagnosis = await analyzeIncident(
    payload.name,
    payload.url,
    payload.errorDetails,
  );

  await prisma.aIInsight.create({
    data: {
      incidentId: payload.incidentId,
      analysis: aiDiagnosis.causa_probable,
      suggestion: aiDiagnosis.accion_recomendada,
      criticality: aiDiagnosis.nivel_criticidad,
    },
  });
  console.log(`Insight guardado exitosamente para el monitor ${payload.name}`);
};
