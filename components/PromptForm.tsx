
import React, { useState } from 'react';

interface PromptFormProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const PromptForm: React.FC<PromptFormProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
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
