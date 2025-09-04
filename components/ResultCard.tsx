
import React from 'react';
import type { GeneratedResult } from '../types';

interface ResultCardProps {
    result: GeneratedResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105">
            <div className="aspect-square bg-gray-200 flex items-center justify-center">
                 <img src={result.imageUrl} alt={result.headline} className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
                <h3 className="text-lg font-bold text-gray-800 text-center">
                    {result.headline}
                </h3>
            </div>
        </div>
    );
};

export default ResultCard;
