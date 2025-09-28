import React, { useState } from 'react';
import { AppState } from '../types';
import Spinner from './common/Spinner';

interface TtsGeneratorProps {
  appState: AppState;
  updateAppState: (newState: Partial<AppState>) => void;
}

const VOICES = [
    { id: 'zephyr', name: 'Zephyr (Thân thiện & Ấm áp)' },
    { id: 'puck', name: 'Puck (Lạc quan & Năng động)' },
    { id: 'charon', name: 'Charon (Trầm & Thuyết phục)' },
    { id: 'kore', name: 'Kore (Rõ ràng & Chuyên nghiệp)' },
];

// Helper to create a WAV file from an AudioBuffer
const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };

    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };
    
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length of format data
    setUint16(1); // PCM - integer samples
    setUint16(numOfChan); // two channels
    setUint32(buffer.sampleRate); // samples per second
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg bytes per second
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit samples

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    for (i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });
};


const TtsGenerator: React.FC<TtsGeneratorProps> = ({ appState, updateAppState }) => {
    const { generatedContent, generatedAudio } = appState;
    const [text, setText] = useState(generatedContent || 'Chào mừng đến với nhà hàng của chúng tôi! Hãy thử món gà rán cay mới của chúng tôi ngay hôm nay!');
    const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const handleGenerate = async () => {
        if (!text) return;

        setIsGenerating(true);
        updateAppState({ generatedAudio: null });

        // Simulate API call by generating a silent audio file
        // The duration is based on an average reading speed of 180 words per minute
        const words = text.trim().split(/\s+/).length;
        const durationSeconds = Math.max(1, (words / 180) * 60);

        try {
            const sampleRate = 24000;
            const offlineContext = new OfflineAudioContext(1, sampleRate * durationSeconds, sampleRate);
            const renderedBuffer = await offlineContext.startRendering();
            const wavBlob = bufferToWav(renderedBuffer);
            const audioUrl = URL.createObjectURL(wavBlob);
            updateAppState({ generatedAudio: audioUrl });
        } catch (error) {
            console.error("Failed to generate mock audio:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white">Tạo giọng nói & Chuyển văn bản thành giọng nói</h2>
                <p className="text-gray-400 mt-2">Chuyển đổi văn bản marketing của bạn thành âm thanh hấp dẫn cho video và quảng cáo. <br/><span className="text-sm text-amber-400">(Lưu ý: Âm thanh là trình giữ chỗ im lặng để tạo video.)</span></p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="bg-card p-6 rounded-xl space-y-6">
                    <div>
                        <label className="text-lg font-semibold text-white block mb-2">1. Văn bản của bạn</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={8}
                            className="w-full bg-dark p-3 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary"
                            placeholder="Nhập văn bản bạn muốn chuyển thành giọng nói..."
                        />
                    </div>
                    <div>
                        <label className="text-lg font-semibold text-white block mb-2">2. Chọn một giọng nói</label>
                        <select
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="w-full bg-dark p-3 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary"
                        >
                            {VOICES.map(voice => (
                                <option key={voice.id} value={voice.id}>{voice.name}</option>
                            ))}
                        </select>
                    </div>
                     <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !text}
                        className="w-full bg-primary disabled:bg-gray-600 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 flex items-center justify-center"
                    >
                        {isGenerating ? <Spinner /> : 'Tạo âm thanh'}
                    </button>
                </div>

                {/* Output */}
                <div className="bg-card p-6 rounded-xl flex flex-col justify-center items-center space-y-4">
                    <h3 className="text-xl font-bold">Âm thanh đã tạo</h3>
                    {isGenerating && (
                        <div className="text-center">
                            <Spinner large/>
                            <p className="text-gray-400 mt-4">AI đang khởi động giọng nói...</p>
                        </div>
                    )}
                    {generatedAudio && (
                         <div className="w-full max-w-sm">
                            <audio controls src={generatedAudio} className="w-full">
                                Trình duyệt của bạn không hỗ trợ phần tử âm thanh.
                            </audio>
                            <p className="text-sm text-center mt-2 text-green-400">Tạo âm thanh hoàn tất!</p>
                        </div>
                    )}
                    {!isGenerating && !generatedAudio && (
                        <div className="text-gray-500">Trình phát âm thanh của bạn sẽ xuất hiện ở đây.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TtsGenerator;