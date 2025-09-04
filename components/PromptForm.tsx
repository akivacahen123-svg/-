import React, { useState } from 'react';
import type { AspectRatio, TextStyle } from '../types';

interface PromptFormProps {
  onSubmit: (prompt: string, aspectRatio: AspectRatio, wordLimit: number | null, textStyle: TextStyle) => void;
  isLoading: boolean;
}

const aspectRatioOptions: { value: AspectRatio; label: string }[] = [
  { value: '1:1', label: 'ריבוע (1:1)' },
  { value: '4:3', label: 'לרוחב (4:3)' },
  { value: '3:4', label: 'לאורך (3:4)' },
];

const styleOptions: { value: TextStyle; label: string }[] = [
  { value: 'default', label: 'רגיל' },
  { value: 'teaser', label: 'טיזרי' },
  { value: 'newsy', label: 'חדשותי' },
  { value: 'formal', label: 'שפה גבוהה' },
];

const PromptForm: React.FC<PromptFormProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [wordLimit, setWordLimit] = useState('');
  const [textStyle, setTextStyle] = useState<TextStyle>('default');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt, aspectRatio, wordLimit ? parseInt(wordLimit, 10) : null, textStyle);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="prompt-textarea" className="block text-lg font-bold text-gray-800 mb-2">
            מה הצורך שלכם?
          </label>
          <textarea
            id="prompt-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='לדוגמה: "אני צריך תוכן לפוסט על פתיחת מסעדה כשרה חדשה בבני ברק"'
            className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200 resize-none"
            rows={4}
            disabled={isLoading}
          />
        </div>

        <div>
            <label htmlFor="word-limit-input" className="block text-lg font-bold text-gray-800 mb-2">
                הגבלת מילים לכותרת (אופציונלי)
            </label>
            <input
                id="word-limit-input"
                type="number"
                value={wordLimit}
                onChange={(e) => setWordLimit(e.target.value)}
                placeholder="לדוגמה: 5"
                className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200"
                min="1"
                disabled={isLoading}
            />
        </div>
        
        <fieldset>
          <legend className="block text-lg font-bold text-gray-800 mb-3">סגנון הכותרת</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {styleOptions.map((option) => (
              <label key={option.value} htmlFor={`style-${option.value}`} className={`relative flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors duration-200 ${textStyle === option.value ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500' : 'bg-white border-gray-300 hover:bg-gray-100'}`}>
                <input
                  type="radio"
                  id={`style-${option.value}`}
                  name="textStyle"
                  value={option.value}
                  checked={textStyle === option.value}
                  onChange={() => setTextStyle(option.value)}
                  className="sr-only"
                  aria-labelledby={`style-label-${option.value}`}
                  disabled={isLoading}
                />
                <span id={`style-label-${option.value}`} className="font-semibold text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="block text-lg font-bold text-gray-800 mb-3">יחס תמונה</legend>
          <div className="grid grid-cols-3 gap-4">
            {aspectRatioOptions.map((option) => (
              <label key={option.value} htmlFor={`ratio-${option.value}`} className={`relative flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors duration-200 ${aspectRatio === option.value ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500' : 'bg-white border-gray-300 hover:bg-gray-100'}`}>
                <input
                  type="radio"
                  id={`ratio-${option.value}`}
                  name="aspectRatio"
                  value={option.value}
                  checked={aspectRatio === option.value}
                  onChange={() => setAspectRatio(option.value)}
                  className="sr-only"
                  aria-labelledby={`ratio-label-${option.value}`}
                  disabled={isLoading}
                />
                <span id={`ratio-label-${option.value}`} className="font-semibold text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="w-full flex justify-center items-center gap-2 px-6 py-3 border border-transparent text-lg font-bold rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? 'בתהליך...' : 'צור תוכן'}
        </button>
      </form>
    </div>
  );
};

export default PromptForm;