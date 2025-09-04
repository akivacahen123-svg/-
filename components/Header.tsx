
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="text-center py-8 md:py-12 bg-white border-b border-gray-200">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800">
                יוצר דאמי תוכן
            </h1>
            <p className="mt-4 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
                הסבירו מה הצורך שלכם, והבינה המלאכותית תיצור עבורכם 5 הצעות לתמונות וכותרות מותאמות למגזר החרדי.
            </p>
        </header>
    );
};

export default Header;
