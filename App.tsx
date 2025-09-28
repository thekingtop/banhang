import React, { useState, useCallback } from 'react';
import { PhotoIcon, PencilSquareIcon, CalendarDaysIcon, SpeakerWaveIcon, VideoCameraIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import ImageEditor from './components/ImageEditor';
import ContentGenerator from './components/ContentGenerator';
import ContentCalendar from './components/ContentCalendar';
import TtsGenerator from './components/TtsGenerator';
import VideoCreator from './components/VideoCreator';
import StoryboardGenerator from './components/StoryboardGenerator';
import { AppState, Tool } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    activeTool: 'editor',
    originalImage: null,
    originalImages: null,
    editedImage: null,
    editedImages: null,
    generatedContent: '',
    generatedAudio: null,
    generatedVideo: null,
    generatedStoryboard: null,
    userPrompt: '',
  });

  const updateAppState = useCallback((newState: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...newState }));
  }, []);

  const renderTool = () => {
    switch (appState.activeTool) {
      case 'editor':
        return <ImageEditor appState={appState} updateAppState={updateAppState} />;
      case 'content':
        return <ContentGenerator appState={appState} updateAppState={updateAppState} />;
      case 'calendar':
        return <ContentCalendar />;
      case 'tts':
          return <TtsGenerator appState={appState} updateAppState={updateAppState} />;
      case 'video':
          return <VideoCreator appState={appState} updateAppState={updateAppState} />;
      case 'storyboard':
          return <StoryboardGenerator appState={appState} updateAppState={updateAppState} />;
      default:
        return <ImageEditor appState={appState} updateAppState={updateAppState} />;
    }
  };

  const navItems: { id: Tool; name: string; icon: React.ElementType }[] = [
    { id: 'editor', name: 'Trình chỉnh sửa ảnh', icon: PhotoIcon },
    { id: 'content', name: 'Tạo nội dung bán hàng', icon: PencilSquareIcon },
    { id: 'tts', name: 'Tạo giọng nói', icon: SpeakerWaveIcon },
    { id: 'video', name: 'Tạo Video', icon: VideoCameraIcon },
    { id: 'storyboard', name: 'Storyboard', icon: ClipboardDocumentListIcon },
    { id: 'calendar', name: 'Lịch nội dung', icon: CalendarDaysIcon },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-dark text-light">
      <nav className="w-full md:w-64 bg-card p-4 md:p-6 flex flex-row md:flex-col justify-around md:justify-start md:space-y-4 border-b md:border-b-0 md:border-r border-gray-700">
        <div className="hidden md:flex items-center mb-8">
            <h1 className="text-2xl font-bold text-primary">DishBoost AI</h1>
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => updateAppState({ activeTool: item.id })}
            className={`flex items-center p-3 rounded-lg transition-all duration-200 text-sm md:text-base ${
              appState.activeTool === item.id
                ? 'bg-primary text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5 md:w-6 md:h-6 mr-3" />
            <span className="hidden md:inline">{item.name}</span>
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10">
        {renderTool()}
      </main>
    </div>
  );
};

export default App;