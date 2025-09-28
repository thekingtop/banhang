// services/geminiService.ts

export interface GeminiResponse {
  text?: string;
  error?: string;
  [key: string]: any;
}

// Hàm chuyển File thành base64 (ví dụ khi upload ảnh/video)
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = error => reject(error);
  });
};

// Chuyển DataURL thành blob data (base64 + mimeType)
export const dataUrlToBlobData = (
  dataUrl: string
): { base64: string; mimeType: string } => {
  const parts = dataUrl.split(",");
  const mimeTypePart = parts[0].match(/:(.*?);/);
  if (!mimeTypePart || mimeTypePart.length < 2) {
    throw new Error("Invalid data URL format");
  }
  const mimeType = mimeTypePart[1];
  const base64 = parts[1];
  return { base64, mimeType };
};

/**
 * Gửi prompt text lên backend API Gemini
 */
export const analyzeCaseFiles = async (prompt: string): Promise<GeminiResponse> => {
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Không thể phân tích hồ sơ");
    }

    return await res.json();
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return { error: error.message || "Lỗi không xác định" };
  }
};

/**
 * Ví dụ: gửi ảnh (base64) lên Gemini qua backend
 */
export const analyzeImage = async (
  base64: string,
  mimeType: string,
  prompt: string
): Promise<GeminiResponse> => {
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image: { base64, mimeType } }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Không thể phân tích ảnh");
    }

    return await res.json();
  } catch (error: any) {
    console.error("Gemini API image error:", error);
    return { error: error.message || "Lỗi không xác định" };
  }
};
