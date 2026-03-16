import { GoogleGenAI, Type } from "@google/genai";
import { TariffData } from "../types";

const TARIFF_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hospital_name: { type: Type.STRING },
    rohini_id: { type: Type.STRING },
    room_categories: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of room categories (headers) found in the table."
    },
    tariffs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          s_no: { type: Type.STRING },
          procedure: { type: Type.STRING },
          system: { type: Type.STRING },
          inclusions: { type: Type.STRING },
          exclusions: { type: Type.STRING },
          rates: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["s_no", "procedure", "rates"],
      },
    },
  },
  required: ["hospital_name", "tariffs"],
};

export async function extractTariffFromPDF(base64Data: string, mimeType: string): Promise<TariffData> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [{
      parts: [
        { inlineData: { data: base64Data, mimeType: mimeType } },
        { text: `
          Extract EVERY SINGLE ROW from the hospital tariff tables.
          1. DO NOT SKIP ROWS.
          2. Split "Inclusion: ...; Exclusion: ..." into separate fields.
          3. EXCLUDE: Room Rent, ICU, Investigations (Lab), Radiology, and Grade 1-7 surgery charges.
          4. NUMERIC RECONSTRUCTION: If a rate is split like "1 27 600", reconstruct it as "127600".
          5. RATE COUNT: The number of rates MUST match the number of room categories.
        `.trim() }
      ]
    }],
    config: {
      systemInstruction: "You are a high-precision medical data extraction specialist. Reconstruct split numbers (e.g., '1 27 600' -> '127600'). Exclude ancillary charges.",
      responseMimeType: "application/json",
      responseSchema: TARIFF_RESPONSE_SCHEMA,
    },
  });

  if (!response.text) {
      throw new Error("No response from model");
  }

  const parsed = JSON.parse(response.text) as TariffData;
  
  // Post-processing to ensure clean numbers
  if (parsed.tariffs && parsed.room_categories) {
    const catCount = parsed.room_categories.length;
    parsed.tariffs = parsed.tariffs.map(t => {
      let cleanedRates = t.rates.map(r => r.replace(/\s/g, '').replace(/,/g, ''));
      if (cleanedRates.length > catCount && cleanedRates.length % catCount === 0) {
        const ratio = cleanedRates.length / catCount;
        const joined = [];
        for (let i = 0; i < catCount; i++) {
          joined.push(cleanedRates.slice(i * ratio, (i + 1) * ratio).join(''));
        }
        cleanedRates = joined;
      }
      return { ...t, rates: cleanedRates };
    });
  }
  return parsed;
}
