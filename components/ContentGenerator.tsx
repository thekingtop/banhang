
import React, { useState, useEffect } from 'react';
import { AppState } from '../types';
import { generateContent } from '../services/geminiService';
import Spinner from './common/Spinner';

interface ContentGeneratorProps {
  appState: AppState;
  updateAppState: (newState: Partial<AppState>) => void;
}

const ContentGenerator: React.FC<ContentGeneratorProps> = ({ appState, updateAppState }) => {
  const { editedImage, originalImage, generatedContent } = appState;
  const displayImage = editedImage || originalImage;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState('Giới thiệu món mới');
  const [platform, setPlatform] = useState('Facebook');

  const handleGenerate = async () => {
    if (!displayImage) {
      setError('Vui lòng chỉnh sửa ảnh trước.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
        // Fetch the image data to get the mime type and base64 string
        const response = await fetch(displayImage);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            const base64String = base64data.split(',')[1];
            const mimeType = blob.type;

            const content = await generateContent(base64String, mimeType, goal, platform);
            updateAppState({ generatedContent: content });
            setIsLoading(false);
        };
    } catch (err) {
      setError('Tạo nội dung thất bại. Vui lòng thử lại.');
      console.error(err);
      setIsLoading(false);
    }
  };
  
  const handleCopyToClipboard = () => {
      navigator.clipboard.writeText(generatedContent);
  };
  
  useEffect(() => {
    if(displayImage){
      setError(null);
    }
  }, [displayImage]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Tạo nội dung bán hàng</h2>
        <p className="text-gray-400 mt-2">Tạo chú thích, CTA và hashtag hấp dẫn cho các nền tảng mạng xã hội của bạn.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls and Preview */}
        <div className="bg-card p-6 rounded-xl space-y-6">
          <div className="w-full aspect-video bg-dark rounded-lg flex items-center justify-center">
            {displayImage ? (
              <img src={displayImage} alt="Dish" className="max-h-full max-w-full object-contain" />
            ) : (
              <p className="text-gray-500">Đi tới Trình chỉnh sửa ảnh để bắt đầu.</p>
            )}
          </div>
          <div>
            <label htmlFor="goal" className="text-lg font-semibold text-white block mb-2">1. Chọn mục tiêu</label>
            <select id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full bg-dark p-3 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary">
              <option>Giới thiệu món mới</option>
              <option>Chạy khuyến mãi</option>
              <option>Tăng tương tác</option>
              <option>Tăng lưu lượng truy cập website</option>
            </select>
          </div>
          <div>
            <label htmlFor="platform" className="text-lg font-semibold text-white block mb-2">2. Chọn nền tảng</label>
            <select id="platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-dark p-3 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary">
              <option>Facebook</option>
              <option>Zalo</option>
              <option>TikTok</option>
              <option>Instagram</option>
            </select>
          </div>
          <button onClick={handleGenerate} disabled={isLoading || !displayImage} className="w-full bg-primary disabled:bg-gray-600 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 flex justify-center items-center">
            {isLoading ? <Spinner /> : 'Tạo nội dung'}
          </button>
          {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </div>

        {/* Generated Content */}
        <div className="bg-card p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4">Nội dung đã tạo</h3>
          <div className="w-full h-full min-h-[300px] bg-dark p-4 rounded-lg text-gray-300 whitespace-pre-wrap overflow-y-auto relative">
              {generatedContent ? (
                  <>
                    <button onClick={handleCopyToClipboard} className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-lg text-sm">
                      Sao chép
                    </button>
                    {generatedContent}
                  </>
              ) : (
                  <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">Nội dung do AI tạo sẽ xuất hiện ở đây.</p>
                  </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentGenerator;