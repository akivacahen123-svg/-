
import { GoogleGenAI, Type } from "@google/genai";
import type { ContentIdea } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export async function generateContentIdeas(userPrompt: string): Promise<ContentIdea[]> {
    const prompt = `
        Based on the user's request: "${userPrompt}", generate 5 content ideas suitable for the Haredi Jewish community in Israel.
        For each idea, provide a catchy headline in Hebrew and a detailed, descriptive prompt in English for an AI image generator.
        The image prompt must describe a scene that is culturally appropriate, high-quality, and strictly avoids depicting any women or girls.
        Focus on men, boys, objects, landscapes, or symbolic imagery.
        Return the response as a JSON object adhering to the provided schema.
    `;

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

export async function generateImageFromPrompt(imagePrompt: string): Promise<string> {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: imagePrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    
    throw new Error("Image generation failed or returned no images.");
}
