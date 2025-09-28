import React, { useState } from 'react';
import { AppState } from '../types';
import { generateStoryboard } from '../services/geminiService';
import Spinner from './common/Spinner';

interface StoryboardGeneratorProps {
  appState: AppState;
  updateAppState: (newState: Partial<AppState>) => void;
}

const StoryboardGenerator: React.FC<StoryboardGeneratorProps> = ({ appState, updateAppState }) => {
  const { generatedStoryboard } = appState;
  const [videoIdea, setVideoIdea] = useState('Một video quảng cáo ngắn giới thiệu món gà rán phô mai mới của chúng tôi.');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!videoIdea) {
      setError('Vui lòng nhập ý tưởng video.');
      return;
    }
    setIsLoading(true);
    setError(null);
    updateAppState({ generatedStoryboard: null });

    try {
      const storyboard = await generateStoryboard(videoIdea);
      updateAppState({ generatedStoryboard: storyboard });
    } catch (err) {
      setError('Tạo storyboard thất bại. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Tạo Storyboard</h2>
        <p className="text-gray-400 mt-2">Lên kế hoạch cho video của bạn bằng cách tạo một kịch bản phân cảnh chi tiết từ ý tưởng của bạn.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="bg-card p-6 rounded-xl space-y-6 self-start">
          <div>
            <label htmlFor="video-idea" className="text-lg font-semibold text-white block mb-2">1. Nhập ý tưởng video của bạn</label>
            <textarea
              id="video-idea"
              value={videoIdea}
              onChange={(e) => setVideoIdea(e.target.value)}
              rows={6}
              className="w-full bg-dark p-3 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary"
              placeholder="Ví dụ: Video giới thiệu combo mì cay và gà rán cho mùa đông..."
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading || !videoIdea}
            className="w-full bg-primary disabled:bg-gray-600 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 flex justify-center items-center"
          >
            {isLoading ? <Spinner /> : 'Tạo Storyboard'}
          </button>
          {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </div>

        {/* Generated Storyboard */}
        <div className="bg-card p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4">Storyboard đã tạo</h3>
          <div className="w-full h-full min-h-[400px] bg-dark p-4 rounded-lg text-gray-300 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Spinner large />
              </div>
            ) : generatedStoryboard && generatedStoryboard.length > 0 ? (
              <div className="space-y-4">
                {generatedStoryboard.map((scene) => (
                  <div key={scene.sceneNumber} className="bg-card p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-bold text-primary">Cảnh {scene.sceneNumber}</h4>
                    <div className="mt-2">
                      <p className="font-semibold text-white">Hình ảnh:</p>
                      <p className="text-gray-400">{scene.visualDescription}</p>
                    </div>
                    <div className="mt-2">
                      <p className="font-semibold text-white">Lời thoại:</p>
                      <p className="text-gray-400 italic">"{scene.voiceoverScript}"</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-center">Storyboard do AI tạo sẽ xuất hiện ở đây.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryboardGenerator;