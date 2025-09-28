// File: api/generateImage.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
// Quan trọng: Import hàm service của bạn từ thư mục services
import { compositeProductOnly } from '../services/geminiService';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // 1. Chỉ cho phép phương thức POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. Lấy dữ liệu từ body của request mà frontend gửi lên
    // Lưu ý: Xử lý file upload (FormData) sẽ phức tạp hơn, 
    // đây là ví dụ đơn giản hóa với dữ liệu JSON.
    const { 
        productFile, // Dữ liệu file cần được xử lý đặc biệt
        backgroundDescription, 
        cameraAngle, 
        userPrompt 
    } = request.body;
    
    // 3. Gọi hàm service của bạn (chạy trên server)
    // Hàm này bây giờ có thể đọc process.env.API_KEY mà không bị lỗi
    const generatedImages = await compositeProductOnly(
      productFile,
      backgroundDescription,
      cameraAngle,
      userPrompt
    );

    // 4. Trả kết quả về cho frontend
    return response.status(200).json({ images: generatedImages });

  } catch (error: any) {
    // Xử lý lỗi
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}
