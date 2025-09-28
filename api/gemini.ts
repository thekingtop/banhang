// api/gemini.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  const { prompt } = req.body as { prompt: string };

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const result = await ai.models.generateContent({
      model: "gemini-1.5-pro", // bạn có thể đổi sang gemini-1.5-flash nếu muốn nhanh hơn
      input: prompt,
    });

    res.status(200).json({ text: result.output_text });
  } catch (err: any) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: err.message || "Gemini API call failed" });
  }
}
