
import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import PromptForm from './components/PromptForm';
import LoadingSpinner from './components/LoadingSpinner';
import ResultsDisplay from './components/ResultsDisplay';
import { generateContentIdeas, generateImageFromPrompt } from './services/geminiService';
import type { GeneratedResult, ContentIdea, AspectRatio, TextStyle } from './types';

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<GeneratedResult[]>([]);

    const handleSubmit = useCallback(async (userPrompt: string, aspectRatio: AspectRatio, wordLimit: number | null, textStyle: TextStyle) => {
        setIsLoading(true);
        setError(null);
        setResults([]);

        try {
            const contentIdeas: ContentIdea[] = await generateContentIdeas(userPrompt, wordLimit, textStyle);

            if (!contentIdeas || contentIdeas.length === 0) {
                throw new Error("לא התקבלו רעיונות מהמודל.");
            }

            const imagePromises = contentIdeas.map(idea => 
                generateImageFromPrompt(idea.image_prompt, aspectRatio)
            );
            
            const imageUrls = await Promise.all(imagePromises);

            const finalResults = contentIdeas.map((idea, index) => ({
                headline: idea.headline,
                imageUrl: imageUrls[index],
            }));
            
            setResults(finalResults);
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
            setError(`אירעה שגיאה ביצירת התוכן. (${errorMessage})`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <div className="min-h-screen bg-sky-50 text-gray-900">
            <Header />
            <main>
                <PromptForm onSubmit={handleSubmit} isLoading={isLoading} />
                
                {isLoading && <LoadingSpinner />}
                
                {error && (
                    <div className="text-center my-6">
                        <p className="text-red-600 bg-red-100 p-4 rounded-md max-w-2xl mx-auto">{error}</p>
                    </div>
                )}
                
                <ResultsDisplay results={results} />
            </main>
            <footer className="text-center py-4 mt-8 border-t border-sky-200 bg-white">
                <p className="text-sm text-gray-500">פותח באמצעות Gemini API</p>
            </footer>
        </div>
    );
};

export default App;