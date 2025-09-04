import React from 'react';
import type { GeneratedResult } from '../types';
import ResultCard from './ResultCard';

interface ResultsDisplayProps {
    results: GeneratedResult[];
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
    if (results.length === 0) {
        return null;
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">התוצאות שלך</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 items-start">
                {results.map((result, index) => (
                    <ResultCard key={index} result={result} />
                ))}
            </div>
        </div>
    );
};

export default ResultsDisplay;
