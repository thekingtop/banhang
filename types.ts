export type Tool = 'editor' | 'content' | 'calendar' | 'tts' | 'video' | 'storyboard';

export interface AppState {
  activeTool: Tool;
  originalImage: string | null; // Ảnh hiện đang hoạt động/xem trước
  originalImages: string[] | null; // Tất cả ảnh đã tải lên để xử lý hàng loạt
  editedImage: string | null; // Hình ảnh được chọn để xem trước
  editedImages: string[] | null; // 8 biến thể do AI tạo ra HOẶC các ảnh đã được xử lý hàng loạt
  generatedContent: string;
  generatedAudio: string | null;
  generatedVideo: string | null;
  generatedStoryboard: StoryboardScene[] | null;
  userPrompt: string;
}

export interface CalendarSuggestion {
  day: string;
  theme: string;
  idea: string;
}

export interface Preset {
  name: string;
  style: string;
}

export interface StoryboardScene {
  sceneNumber: number;
  visualDescription: string;
  voiceoverScript: string;
}