// api/gemini.ts
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  const { prompt } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const result = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      input: prompt,
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
