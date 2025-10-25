import React from 'react';
import { History, X } from 'lucide-react';
import type { HistoryItem } from '../types';


interface HistoryViewProps {
  history: HistoryItem[];
  onClose: () => void;
  onReplay: (item: HistoryItem) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onClose, onReplay }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center">
          <History className="w-6 h-6 text-blue-500 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">История тренировок</h2>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
        {history.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Пока нет записей</p>
            <p className="text-sm text-gray-400 mt-2">Начните тренировку, чтобы увидеть прогресс</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => onReplay(item)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">{item.date}</span>
                  <span className={`text-2xl font-bold ${item.score >= 80 ? 'text-green-500' : item.score >= 60 ? 'text-blue-500' : 'text-orange-500'}`}>
                    {item.score}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
                  <div>
                    <div className="text-gray-400">Темп</div>
                    <div className="font-medium">{item.metrics.pace}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Паразиты</div>
                    <div className="font-medium">{item.metrics.fillerWords}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Четкость</div>
                    <div className="font-medium">{item.metrics.clarity}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Словарь</div>
                    <div className="font-medium">{item.metrics.vocabulary}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default HistoryView;
