import { GoogleGenAI, Type } from "@google/genai";
import type { ContentIdea, AspectRatio, TextStyle } from '../types';

// Cast window to any to access our custom config
const config = (window as any).APP_CONFIG;

if (!config || !config.API_KEY || config.API_KEY === 'כאן יש להדביק את מפתח ה-API שלך') {
    throw new Error("מפתח ה-API אינו מוגדר. אנא הוסף אותו בקובץ config.js");
}

const ai = new GoogleGenAI({ apiKey: config.API_KEY });

const contentIdeasSchema = {
    type: Type.OBJECT,
    properties: {
        content: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    headline: {
                        type: Type.STRING,
                        description: "כותרת קליטה ומתאימה בעברית"
                    },
                    image_prompt: {
                        type: Type.STRING,
                        description: "הנחיה מפורטת באנגלית ליצירת תמונה, ללא נשים"
                    }
                },
                required: ["headline", "image_prompt"]
            }
        }
    },
    required: ["content"]
};

export async function generateContentIdeas(userPrompt: string, wordLimit: number | null, textStyle: TextStyle): Promise<ContentIdea[]> {
    const styleInstructionMap: Record<TextStyle, string> = {
        default: 'The headline should be catchy and suitable for the context.',
        teaser: 'The headline should be slightly teasing and intriguing, while remaining credible and accurately describing the content.',
        newsy: 'The headline should be written in a journalistic, interesting, and newsworthy style.',
        formal: 'The headline must be written in high-level, formal Hebrew, with perfect grammar and no colloquialisms.',
    };
    
    const styleInstruction = styleInstructionMap[textStyle];

    let prompt = `
        Based on the user's request: "${userPrompt}", generate 5 content ideas suitable for the Haredi Jewish community in Israel.
        For each idea, provide two things:
        1. A catchy headline in Hebrew. This headline must follow a specific style: "${styleInstruction}".
        2. A detailed, descriptive prompt in English for an AI image generator. The image prompt must describe a scene that is culturally appropriate, high-quality, and strictly avoids depicting any women or girls. Focus on men, boys, objects, landscapes, or symbolic imagery.
        Return the response as a JSON object adhering to the provided schema.
    `;

    if (wordLimit) {
        prompt += `\nEach Hebrew headline must be no more than ${wordLimit} words long.`;
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: contentIdeasSchema,
        },
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    return parsed.content;
}

export async function generateImageFromPrompt(imagePrompt: string, aspectRatio: AspectRatio): Promise<string> {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: imagePrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio,
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    
    throw new Error("Image generation failed or returned no images.");
}