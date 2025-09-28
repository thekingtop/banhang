import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { CalendarSuggestion, StoryboardScene } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const dataUrlToBlobData = (dataUrl: string): { base64: string, mimeType: string } => {
    const parts = dataUrl.split(',');
    const mimeTypePart = parts[0].match(/:(.*?);/);
    if (!mimeTypePart || mimeTypePart.length < 2) {
        throw new Error("Invalid data URL format");
    }
    const mimeType = mimeTypePart[1];
    const base64 = parts[1];
    return { base64, mimeType };
};


export const removeBackground = async (imageFile: File, preserveFace: boolean, count: number = 8): Promise<string[]> => {
  const base64Image = await fileToBase64(imageFile);
  const prompt = `Nhiệm vụ: Xóa nền khỏi hình ảnh được cung cấp. Chỉ giữ lại chủ thể chính (món ăn và/hoặc người).

Yêu cầu đầu ra:
1.  Tạo ra một phiên bản của hình ảnh với nền đã được xóa.
2.  Kết quả phải là ảnh PNG với nền hoàn toàn trong suốt.
3.  Chủ thể phải được cắt ra một cách sạch sẽ và chính xác.
${preserveFace ? "4. **YÊU CẦU QUAN TRỌNG NHẤT:** Hình ảnh này có chứa một người. Việc giữ nguyên 100% khuôn mặt, tóc, và tất cả các đặc điểm nhận dạng của người đó là ưu tiên hàng đầu. TUYỆT ĐỐI KHÔNG thay đổi khuôn mặt hoặc danh tính của nhân vật." : ""}

Hãy cung cấp 1 kết quả hình ảnh.`;

  const apiCall = () => ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: imageFile.type,
          },
        },
        { text: prompt },
      ],
    },
    config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });
  
  const promises = Array(count).fill(null).map(apiCall);
  const responses = await Promise.all(promises);

  const images: string[] = [];
    for (const response of responses) {
        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    images.push(part.inlineData.data);
                    break; 
                }
            }
        }
    }

    if (images.length === 0) {
        const firstResponse = responses[0];
        let reason = "Không có hình ảnh nào được tạo bởi API.";
        if (firstResponse?.promptFeedback?.blockReason) {
            reason = `Yêu cầu bị chặn vì lý do: ${firstResponse.promptFeedback.blockReason}. Vui lòng điều chỉnh ảnh hoặc mô tả của bạn.`;
        } else if (firstResponse?.candidates?.[0]?.finishReason && firstResponse.candidates[0].finishReason !== 'STOP') {
            reason = `API không thể hoàn thành yêu cầu. Lý do: ${firstResponse.candidates[0].finishReason}.`;
        }
        throw new Error(reason);
    }
    return images;
};

export const compositeProductOnly = async (
    productFile: File,
    backgroundDescription: string,
    cameraAngle: string,
    userPrompt: string
): Promise<string[]> => {
    const productBase64 = await fileToBase64(productFile);

    const prompt = `**CHỈ THỊ CHÍNH: Hoạt động như một chuyên gia ghép ảnh và chỉnh sửa ảnh kỹ thuật số.**
Mục tiêu của bạn là tạo ra một hình ảnh ghép siêu thực bằng cách TẠO RA một bối cảnh từ mô tả và sau đó tích hợp liền mạch một SẢN PHẨM vào đó. Hình ảnh cuối cùng phải trông giống như được chụp trong một bức ảnh chuyên nghiệp duy nhất.

**YÊU CẦU SÁNG TẠO:**
- **Bối cảnh:** Tạo một bối cảnh dựa trên mô tả sau: **"${backgroundDescription}"**. Sau đó, kết hợp hình ảnh SẢN PHẨM được cung cấp vào bối cảnh đó một cách liền mạch. Bối cảnh phải trông chân thực, có ánh sáng và phối cảnh phù hợp.
- **Góc chụp:** Bố cục cuối cùng phải tuân thủ góc chụp **${cameraAngle}**.
${userPrompt ? `- **CHỈ DẪN BỔ SUNG TỪ NGƯỜI DÙNG:** ${userPrompt}` : ''}

**DANH SÁCH KIỂM TRA ĐỘ CHÂN THỰC (BẮT BUỘC):**
1.  **Hòa hợp Ánh sáng (QUAN TRỌNG):**
    *   **Phân tích Nguồn sáng:** Xác định hướng, màu sắc và độ mềm của(các) nguồn sáng chính trong BỐI CẢNH.
    *   **Tái chiếu sáng Sản phẩm:** Áp dụng ánh sáng tương tự cho SẢN PHẨM. Điều này bao gồm việc khớp hướng ánh sáng chính và tạo ra các điểm nhấn và bóng đổ thực tế.
    *   **Ánh sáng Phản xạ & Lan tỏa Màu sắc:** Sản phẩm phải nhận được các phản xạ màu sắc tinh tế từ môi trường xung quanh trong bối cảnh.

2.  **Độ chính xác của Bóng đổ:**
    *   **Bóng đổ Chính:** Tạo bóng đổ chính xác từ sản phẩm lên các bề mặt trong bối cảnh. Hướng, độ dài, độ mềm và mật độ của bóng phải khớp với nguồn sáng chính.
    *   **Bóng tiếp xúc:** Thêm các bóng nhỏ, tối và mềm ở những nơi sản phẩm tiếp xúc với các bề mặt.

3.  **Toàn vẹn về Phối cảnh & Tỷ lệ:**
    *   **Khớp Đường chân trời:** SẢN PHẨM phải được đặt trên một mặt phẳng phù hợp với phối cảnh và đường chân trời của BỐI CẢNH.
    *   **Tỷ lệ chính xác:** Tỷ lệ của sản phẩm phải hợp lý so với các vật thể trong bối cảnh. KHÔNG kéo dài hoặc nén sản phẩm một cách không cân đối.

**CÁC YÊU CẦU CẤM TUYỆT ĐỐI (NEGATIVE PROMPTS):**
*   **KHÔNG** có cảm giác "dán chồng" hoặc "lơ lửng". Sản phẩm phải trông như đang ở trong cùng một không gian vật lý.

**ĐẦU RA CUỐI CÙNG:**
Cung cấp 1 hình ảnh PNG chất lượng cao, là một cảnh siêu thực duy nhất, tuân thủ nghiêm ngặt tất cả các chỉ thị trên.`;

    const apiCall = () => ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { data: productBase64, mimeType: productFile.type } },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const promises = Array(8).fill(null).map(apiCall);
    const responses = await Promise.all(promises);
    
    const images: string[] = [];
    for (const response of responses) {
        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    images.push(part.inlineData.data);
                    break;
                }
            }
        }
    }

    if (images.length === 0) {
        const firstResponse = responses[0];
        let reason = "Không có hình ảnh nào được tạo bởi API.";
        if (firstResponse?.promptFeedback?.blockReason) {
            reason = `Yêu cầu bị chặn vì lý do: ${firstResponse.promptFeedback.blockReason}. Vui lòng điều chỉnh ảnh hoặc mô tả của bạn.`;
        } else if (firstResponse?.candidates?.[0]?.finishReason && firstResponse.candidates[0].finishReason !== 'STOP') {
            reason = `API không thể hoàn thành yêu cầu. Lý do: ${firstResponse.candidates[0].finishReason}.`;
        }
        throw new Error(reason);
    }
    return images;
};


export const compositeImages = async (
    productFile: File,
    characterFile: File,
    backgroundDescription: string,
    cameraAngle: string,
    characterPose: string,
    characterCostume: string,
    userPrompt: string
): Promise<string[]> => {
    const [productBase64, characterBase64] = await Promise.all([
        fileToBase64(productFile),
        fileToBase64(characterFile),
    ]);

    const prompt = `**CHỈ THỊ CHÍNH: Hoạt động như một chuyên gia ghép ảnh và chỉnh sửa ảnh kỹ thuật số.**
Mục tiêu của bạn là tạo ra một hình ảnh ghép siêu thực bằng cách TẠO RA một bối cảnh từ mô tả và sau đó tích hợp liền mạch một NHÂN VẬT và một SẢN PHẨM vào đó. Hình ảnh cuối cùng phải trông giống như được chụp trong một bức ảnh chuyên nghiệp duy nhất. Chất lượng nghệ thuật và kỹ thuật là tối quan trọng.

**QUY TẮC TỐI QUAN TRỌNG: BẢO TOÀN DANH TÍNH NHÂN VẬT**
- **Ưu tiên cao nhất:** Việc giữ nguyên 100% khuôn mặt, kiểu tóc, và các đặc điểm nhận dạng của nhân vật trong ảnh nguồn là yêu cầu **bắt buộc và không thể thương lượng**.
- **KHÔNG THAY ĐỔI:** Tuyệt đối không được thay đổi cấu trúc khuôn mặt, màu mắt, hình dáng mũi, miệng, hay bất kỳ đặc điểm nào khác. Bạn có thể và nên điều chỉnh ánh sáng tổng thể trên nhân vật (bao gồm cả khuôn mặt) để phù hợp với bối cảnh, nhưng bản thân các đặc điểm vật lý phải được giữ nguyên.

**YÊU CẦU SÁNG TẠO:**
- **Bối cảnh:** Tạo một bối cảnh dựa trên mô tả sau: **"${backgroundDescription}"**. Sau đó, kết hợp các hình ảnh NHÂN VẬT và SẢN PHẨM được cung cấp vào bối cảnh đó một cách liền mạch. Bối cảnh phải trông chân thực, có ánh sáng và phối cảnh phù hợp.
- **Góc chụp:** Bố cục cuối cùng phải tuân thủ góc chụp **${cameraAngle}**.
- **Tư thế Nhân vật:** Tạo dáng lại cho nhân vật ở tư thế **${characterPose}**. Sự tương tác với sản phẩm và môi trường phải tự nhiên và đáng tin cậy. Ví dụ, nếu tư thế là 'ngồi', họ phải ngồi một cách thực tế trên một bề mặt hợp lý trong bối cảnh. Nếu là 'cầm sản phẩm', tay của họ phải cầm nắm một cách vật lý chính xác.
- **Trang phục Nhân vật:** ${characterCostume === 'Giữ nguyên' ? 'Trang phục gốc của nhân vật phải được giữ nguyên CHÍNH XÁC như trong ảnh nguồn.' : `Thay đổi trang phục của nhân vật theo phong cách **${characterCostume}**. Trang phục mới phải phù hợp với bối cảnh của cảnh.`}
${userPrompt ? `- **CHỈ DẪN BỔ SUNG TỪ NGƯỜI DÙNG:** ${userPrompt}` : ''}

**DANH SÁCH KIỂM TRA ĐỘ CHÂN THỰC (BẮT BUỘC):**
1.  **Hòa hợp Ánh sáng (QUAN TRỌNG):**
    *   **Phân tích Nguồn sáng:** Xác định hướng, màu sắc và độ mềm của(các) nguồn sáng chính trong BỐI CẢNH.
    *   **Tái chiếu sáng Chủ thể:** Áp dụng ánh sáng tương tự cho NHÂN VẬT và SẢN PHẨM. Điều này bao gồm việc khớp hướng ánh sáng chính và tạo ra các điểm nhấn và bóng đổ thực tế.
    *   **Ánh sáng Phản xạ & Lan tỏa Màu sắc:** Các chủ thể phải nhận được các phản xạ màu sắc tinh tế từ môi trường xung quanh trong bối cảnh (ví dụ: ánh sáng ấm từ bàn gỗ).
    *   **Ánh sáng Viền:** Nếu bối cảnh có đèn nền mạnh, hãy tạo ánh sáng viền phù hợp trên nhân vật và sản phẩm.

2.  **Độ chính xác của Bóng đổ:**
    *   **Bóng đổ Chính:** Tạo bóng đổ chính xác từ nhân vật và sản phẩm lên các bề mặt trong bối cảnh. Hướng, độ dài, độ mềm và mật độ của bóng phải khớp với nguồn sáng chính.
    *   **Bóng tiếp xúc:** Thêm các bóng nhỏ, tối và mềm ở những nơi các vật thể tiếp xúc với các bề mặt (ví dụ: dưới đĩa trên bàn, dưới giày của nhân vật trên sàn). Điều này rất cần thiết để "gắn kết" các vật thể.

3.  **Toàn vẹn về Phối cảnh & Tỷ lệ:**
    *   **Khớp Đường chân trời:** NHÂN VẬT và SẢN PHẨM phải được đặt trên một mặt phẳng phù hợp với phối cảnh và đường chân trời của BỐI CẢNH.
    *   **Tỷ lệ chính xác:** Tỷ lệ của nhân vật và sản phẩm phải hợp lý so với các vật thể trong bối cảnh. **KHÔNG kéo dài, nén hoặc thay đổi tỷ lệ của các chủ thể một cách không cân đối.** Tỷ lệ co giãn của chúng phải được bảo toàn.

4.  **Tích hợp Liền mạch:**
    *   **Chỉnh màu:** Áp dụng một lớp chỉnh màu cuối cùng cho toàn bộ hình ảnh để thống nhất các tông màu, độ bão hòa và độ tương phản của tất cả các yếu tố.
    *   **Độ sâu Trường ảnh:** Đảm bảo độ nét và độ mờ (bokeh) của nhân vật và sản phẩm khớp với độ sâu trường ảnh của hình ảnh bối cảnh. Nếu bối cảnh mờ, các chủ thể cũng phải ở trong hoặc ngoài tiêu điểm một cách tương ứng tùy thuộc vào vị trí của chúng.
    *   **Hiệu ứng Khí quyển:** Nếu bối cảnh có các hiệu ứng khí quyển (sương mù, khói), hãy áp dụng một lượng nhỏ tương tự lên các chủ thể để đặt chúng vào trong môi trường đó.

**CÁC YÊU CẦU CẤM TUYỆT ĐỐI (NEGATIVE PROMPTS):**
*   **KHÔNG** có lỗi về giải phẫu. Giải phẫu của nhân vật phải hoàn hảo (không có thêm tay chân, ngón tay, v.v.).
*   **KHÔNG** có cảm giác "dán chồng" hoặc "lơ lửng". Tất cả các yếu tố phải trông như đang ở trong cùng một không gian vật lý.
*   **KHÔNG** thay đổi các đặc điểm trên khuôn mặt hoặc danh tính của nhân vật (ngoài việc điều chỉnh ánh sáng như đã nêu ở trên).

**ĐẦU RA CUỐI CÙNG:**
Cung cấp 1 hình ảnh PNG chất lượng cao, là một cảnh siêu thực duy nhất, tuân thủ nghiêm ngặt tất cả các chỉ thị trên.`;

    const apiCall = () => ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { data: productBase64, mimeType: productFile.type } },
                { inlineData: { data: characterBase64, mimeType: characterFile.type } },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const promises = Array(8).fill(null).map(apiCall);
    const responses = await Promise.all(promises);

    const images: string[] = [];
    for (const response of responses) {
        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    images.push(part.inlineData.data);
                    break;
                }
            }
        }
    }

    if (images.length === 0) {
        const firstResponse = responses[0];
        let reason = "Không có hình ảnh nào được tạo bởi API.";
        if (firstResponse?.promptFeedback?.blockReason) {
            reason = `Yêu cầu bị chặn vì lý do: ${firstResponse.promptFeedback.blockReason}. Vui lòng điều chỉnh ảnh hoặc mô tả của bạn.`;
        } else if (firstResponse?.candidates?.[0]?.finishReason && firstResponse.candidates[0].finishReason !== 'STOP') {
            reason = `API không thể hoàn thành yêu cầu. Lý do: ${firstResponse.candidates[0].finishReason}.`;
        }
        throw new Error(reason);
    }
    return images;
};


export const generateContent = async (base64Image: string, imageMimeType: string, goal: string, platform: string): Promise<string> => {
    const prompt = `Bạn là một chuyên gia marketing cho các thương hiệu F&B. Dựa trên hình ảnh món ăn được cung cấp, hãy tạo một bài đăng marketing.
    
    **Mục tiêu:** ${goal}
    **Nền tảng:** ${platform}
    
    Bài đăng cần bao gồm:
    1. Một chú thích hấp dẫn.
    2. Lời kêu gọi hành động (CTA) rõ ràng.
    3. Các hashtag liên quan và đang thịnh hành.
    
    Định dạng đầu ra rõ ràng.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType: imageMimeType,
                        data: base64Image,
                    },
                },
                { text: prompt },
            ],
        },
    });

    return response.text;
};

export const suggestCalendar = async (): Promise<CalendarSuggestion[]> => {
    const prompt = "Tạo lịch nội dung 7 ngày cho một nhà hàng chuyên về gà rán và mì cay. Cung cấp chủ đề và ý tưởng nội dung cụ thể cho mỗi ngày, bắt đầu từ Thứ Hai. Ví dụ: Thứ Hai (Đầu tuần): 'Nạp năng lượng cho tuần mới!'";

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    schedule: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                day: { type: Type.STRING, description: "Day of the week" },
                                theme: { type: Type.STRING, description: "The theme for the day's post" },
                                idea: { type: Type.STRING, description: "A concrete content idea for the post" },
                            },
                            required: ["day", "theme", "idea"]
                        }
                    }
                },
                required: ["schedule"]
            },
        },
    });
    
    const jsonResponse = JSON.parse(response.text);
    return jsonResponse.schedule;
};

export const generateStoryboard = async (videoIdea: string): Promise<StoryboardScene[]> => {
    const prompt = `Bạn là một giám đốc sáng tạo chuyên về quảng cáo video ngắn cho các thương hiệu F&B.
    Dựa trên ý tưởng video của người dùng, hãy tạo một storyboard đơn giản từ 3-5 cảnh.

    Ý tưởng Video: "${videoIdea}"

    Đối với mỗi cảnh, hãy cung cấp:
    1. Mô tả hình ảnh (những gì người xem thấy).
    2. Kịch bản lời thoại cho cảnh đó.

    Đầu ra phải ở dạng JSON.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    storyboard: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                sceneNumber: { type: Type.NUMBER, description: "Số thứ tự của cảnh" },
                                visualDescription: { type: Type.STRING, description: "Mô tả chi tiết về hình ảnh cho cảnh." },
                                voiceoverScript: { type: Type.STRING, description: "Kịch bản lời thoại cho cảnh này." }
                            },
                            required: ["sceneNumber", "visualDescription", "voiceoverScript"]
                        }
                    }
                },
                required: ["storyboard"]
            },
        },
    });

    const jsonResponse = JSON.parse(response.text);
    return jsonResponse.storyboard;
};