
import React, { useState, useEffect } from 'react';
import { CalendarSuggestion } from '../types';
import { suggestCalendar } from '../services/geminiService';
import Spinner from './common/Spinner';

const ContentCalendar: React.FC = () => {
  const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await suggestCalendar();
      setSuggestions(result);
    } catch (err) {
      setError('Lấy đề xuất lịch không thành công. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Lịch nội dung</h2>
        <p className="text-gray-400 mt-2">Không bao giờ cạn ý tưởng. Nhận đề xuất nội dung cho cả tuần chỉ bằng một cú nhấp chuột.</p>
      </div>

      <div className="bg-card p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Kế hoạch nội dung hàng tuần của bạn</h3>
          <button onClick={fetchSuggestions} disabled={isLoading} className="bg-primary disabled:bg-gray-600 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg flex items-center">
            {isLoading && <Spinner small />}
            {isLoading ? 'Đang tạo...' : 'Tạo lại ý tưởng'}
          </button>
        </div>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        {isLoading && suggestions.length === 0 ? (
          <div className="text-center py-10"><Spinner large /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {suggestions.map((item, index) => (
              <div key={index} className="bg-dark p-4 rounded-lg flex flex-col">
                <p className="font-bold text-lg text-primary">{item.day}</p>
                <p className="font-semibold text-white mt-1">{item.theme}</p>
                <p className="text-gray-400 text-sm mt-2 flex-grow">{item.idea}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentCalendar;