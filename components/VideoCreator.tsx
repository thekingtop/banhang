import React, { useState, useRef } from 'react';
import { AppState } from '../types';
import { generateVideo } from '../services/videoService';
import Spinner from './common/Spinner';
import ProgressBar from './common/ProgressBar';
import { CheckCircleIcon, ExclamationCircleIcon, PhotoIcon, SpeakerWaveIcon } from '@heroicons/react/24/solid';

interface VideoCreatorProps {
  appState: AppState;
  updateAppState: (newState: Partial<AppState>) => void;
}

const MUSIC_TRACKS = [
    { name: 'Không có', src: '' },
    // Năng động
    { name: 'Pop sôi động', src: 'https://storage.googleapis.com/app-assets-public/upbeat-pop.mp3' },
    { name: 'Rock năng động', src: 'https://storage.googleapis.com/app-assets-public/energetic-rock.mp3' },
    { name: 'Funk vui nhộn', src: 'https://storage.googleapis.com/app-assets-public/funky-town.mp3' },
    { name: 'Hip-hop đường phố', src: 'https://storage.googleapis.com/app-assets-public/street-hiphop.mp3' },
    // Thư giãn
    { name: 'Acoustic thư giãn', src: 'https://storage.googleapis.com/app-assets-public/acoustic-chill.mp3' },
    { name: 'Piano nhẹ nhàng', src: 'https://storage.googleapis.com/app-assets-public/calm-piano.mp3' },
    { name: 'Lo-fi chill', src: 'https://storage.googleapis.com/app-assets-public/lofi-chill.mp3' },
    { name: 'Ambient êm dịu', src: 'https://storage.googleapis.com/app-assets-public/ambient-dreams.mp3' },
    // Hùng tráng
    { name: 'Sử thi hùng tráng', src: 'https://storage.googleapis.com/app-assets-public/epic-orchestral.mp3' },
    { name: 'Trailer điện ảnh', src: 'https://storage.googleapis.com/app-assets-public/cinematic-trailer.mp3' },
    // Khác
    { name: 'Nhạc nền doanh nghiệp', src: 'https://storage.googleapis.com/app-assets-public/corporate-loop.mp3' },
];

const ANIMATION_EFFECTS = [
    { name: 'Không có', value: 'none' },
    { name: 'Phóng to', value: 'zoom-in' },
    { name: 'Thu nhỏ', value: 'zoom-out' },
    { name: 'Lia sang trái', value: 'pan-left' },
    { name: 'Lia sang phải', value: 'pan-right' },
];

const TRANSITION_EFFECTS = [
    { name: 'Không có', value: 'none' },
    { name: 'Mờ dần', value: 'fade-in' },
    { name: 'Trượt từ trái sang', value: 'slide-in-left' },
];


const VideoCreator: React.FC<VideoCreatorProps> = ({ appState, updateAppState }) => {
    const { originalImage, editedImage, generatedAudio, generatedVideo } = appState;
    const sourceImage = editedImage || originalImage;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    
    const [selectedMusic, setSelectedMusic] = useState(MUSIC_TRACKS[1].src);
    const [selectedEffect, setSelectedEffect] = useState(ANIMATION_EFFECTS[1].value);
    const [selectedTransition, setSelectedTransition] = useState(TRANSITION_EFFECTS[1].value);
    const [duration, setDuration] = useState(10);
    const [customMusic, setCustomMusic] = useState<{ name: string; url: string } | null>(null);
    const musicInputRef = useRef<HTMLInputElement>(null);

    const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (customMusic) {
                URL.revokeObjectURL(customMusic.url);
            }
            const url = URL.createObjectURL(file);
            setCustomMusic({ name: file.name, url: url });
            setSelectedMusic(''); // Deselect from dropdown to avoid confusion
        }
    };

    const clearCustomMusic = () => {
        if (customMusic) {
            URL.revokeObjectURL(customMusic.url);
        }
        setCustomMusic(null);
        setSelectedMusic(MUSIC_TRACKS[1].src); // Revert to a default
    };


    const handleGenerateVideo = async () => {
        if (!sourceImage) {
            setError('Vui lòng chọn hoặc tạo ảnh trong Trình chỉnh sửa ảnh trước.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setProgress(0);
        updateAppState({ generatedVideo: null });
        
        try {
            const videoBlob = await generateVideo({
                imageSrc: sourceImage,
                voiceOverSrc: generatedAudio,
                musicSrc: customMusic ? customMusic.url : selectedMusic,
                effect: selectedEffect,
                transition: selectedTransition,
                duration: duration,
                onProgress: setProgress,
            });
            const videoUrl = URL.createObjectURL(videoBlob);
            updateAppState({ generatedVideo: videoUrl });
        } catch (err) {
            console.error(err);
            setError('Đã xảy ra lỗi trong quá trình tạo video. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
            setProgress(100);
        }
    };


    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white">Tạo Video</h2>
                <p className="text-gray-400 mt-2">Kết hợp hình ảnh và giọng nói của bạn với âm nhạc và hoạt ảnh để tạo một video ngắn.</p>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="bg-card p-6 rounded-xl space-y-6">
                    <h3 className="text-xl font-bold text-white border-b border-gray-700 pb-3">Cài đặt Video</h3>
                    
                    {/* Assets */}
                    <div className="space-y-3">
                        <label className="text-lg font-semibold text-white block">1. Tài sản</label>
                        <div className={`flex items-center p-3 rounded-lg ${sourceImage ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                            {sourceImage ? <CheckCircleIcon className="w-6 h-6 text-green-400 mr-3" /> : <ExclamationCircleIcon className="w-6 h-6 text-red-400 mr-3" />}
                            <span className={sourceImage ? 'text-green-300' : 'text-red-300'}>
                                {sourceImage ? 'Đã sẵn sàng ảnh nguồn' : 'Không tìm thấy ảnh nguồn'}
                            </span>
                             {sourceImage && <img src={sourceImage} alt="Source" className="w-12 h-12 rounded-md object-cover ml-auto" />}
                        </div>
                         <div className={`flex items-center p-3 rounded-lg ${generatedAudio ? 'bg-green-900/50' : 'bg-yellow-900/50'}`}>
                             {generatedAudio ? <CheckCircleIcon className="w-6 h-6 text-green-400 mr-3" /> : <SpeakerWaveIcon className="w-6 h-6 text-yellow-400 mr-3" />}
                            <span className={generatedAudio ? 'text-green-300' : 'text-yellow-300'}>
                                {generatedAudio ? 'Đã sẵn sàng giọng đọc' : 'Không có giọng đọc (Tùy chọn)'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Customization */}
                     <div>
                        <label htmlFor="duration" className="text-lg font-semibold text-white block mb-2">2. Thời lượng video (giây)</label>
                        <input type="number" id="duration" value={duration} onChange={e => setDuration(Math.max(1, parseInt(e.target.value, 10)))} min="1" max="60" className="w-full bg-dark p-3 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary" />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label htmlFor="music" className="text-lg font-semibold text-white">3. Nhạc nền</label>
                            <input type="file" accept="audio/*" ref={musicInputRef} onChange={handleMusicUpload} className="hidden" />
                            <button onClick={() => musicInputRef.current?.click()} className="text-sm text-primary hover:underline font-medium">Tải lên nhạc tùy chỉnh</button>
                        </div>
                        {customMusic ? (
                            <div className="flex items-center justify-between bg-dark p-3 rounded-lg border border-gray-600">
                                <span className="truncate text-gray-300 text-sm">{customMusic.name}</span>
                                <button onClick={clearCustomMusic} className="ml-4 text-red-500 hover:text-red-400 text-sm font-bold">Xóa</button>
                            </div>
                        ) : (
                            <select id="music" value={selectedMusic} onChange={(e) => setSelectedMusic(e.target.value)} className="w-full bg-dark p-3 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary">
                                {MUSIC_TRACKS.map(track => <option key={track.name} value={track.src}>{track.name}</option>)}
                            </select>
                        )}
                    </div>

                    <div>
                        <label htmlFor="effect" className="text-lg font-semibold text-white block mb-2">4. Hiệu ứng hoạt ảnh</label>
                        <select id="effect" value={selectedEffect} onChange={(e) => setSelectedEffect(e.target.value)} className="w-full bg-dark p-3 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary">
                            {ANIMATION_EFFECTS.map(effect => <option key={effect.value} value={effect.value}>{effect.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="transition" className="text-lg font-semibold text-white block mb-2">5. Hiệu ứng chuyển cảnh</label>
                        <select id="transition" value={selectedTransition} onChange={(e) => setSelectedTransition(e.target.value)} className="w-full bg-dark p-3 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary">
                            {TRANSITION_EFFECTS.map(effect => <option key={effect.value} value={effect.value}>{effect.name}</option>)}
                        </select>
                    </div>

                    <button onClick={handleGenerateVideo} disabled={isLoading || !sourceImage} className="w-full bg-primary disabled:bg-gray-600 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 flex justify-center items-center">
                        {isLoading ? <Spinner /> : 'Tạo Video'}
                    </button>
                    {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
                </div>

                {/* Preview */}
                <div className="bg-card p-4 rounded-xl flex flex-col items-center justify-center min-h-[400px] lg:min-h-0">
                    <div className="w-full max-w-lg aspect-video bg-dark rounded-lg flex items-center justify-center flex-col overflow-hidden">
                       {isLoading && (
                           <>
                                <Spinner large />
                                <p className="mt-4 text-gray-300">Đang tạo video...</p>
                                <ProgressBar progress={progress} />
                           </>
                       )}
                       {!isLoading && generatedVideo && (
                           <>
                            <video src={generatedVideo} controls autoPlay loop className="w-full h-full"></video>
                           </>
                       )}
                        {!isLoading && !generatedVideo && (
                            <div className="text-center text-gray-500 p-4">
                               <PhotoIcon className="w-16 h-16 mx-auto text-gray-600"/>
                                <p className="mt-2">Video đã tạo của bạn sẽ xuất hiện ở đây.</p>
                            </div>
                        )}
                    </div>
                     {generatedVideo && !isLoading && (
                        <a href={generatedVideo} download={`dishboost-video-${Date.now()}.webm`} className="w-full max-w-lg mt-4 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 text-center">
                            Tải Video xuống
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoCreator;