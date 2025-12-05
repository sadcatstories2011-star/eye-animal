import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { AnimalDetails } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Identifies an animal from a base64 image string.
 */
export const identifyAnimal = async (base64Image: string, mimeType: string): Promise<AnimalDetails> => {
  const modelId = "gemini-2.5-flash"; // Efficient for multimodal tasks

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      commonName: { type: Type.STRING, description: "Common name of the animal" },
      scientificName: { type: Type.STRING, description: "Scientific name of the animal" },
      description: { type: Type.STRING, description: "A well-optimized, engaging description of the animal (approx 50 words)" },
      habitat: { type: Type.STRING, description: "Natural habitat" },
      diet: { type: Type.STRING, description: "Dietary habits" },
      funFact: { type: Type.STRING, description: "One interesting, unique fact" },
      conservationStatus: { type: Type.STRING, description: "IUCN conservation status (e.g., Least Concern, Endangered)" },
    },
    required: ["commonName", "scientificName", "description", "habitat", "diet", "funFact", "conservationStatus"],
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: "Identify this animal and provide detailed information based on the schema.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AnimalDetails;
  } catch (error) {
    console.error("Error identifying animal:", error);
    throw error;
  }
};

/**
 * Generates similar images of the identified animal using GenAI.
 */
export const generateSimilarImages = async (animalName: string): Promise<string[]> => {
  // We will generate 2 variants.
  const modelId = "gemini-2.5-flash-image"; 
  const imageUrls: string[] = [];

  try {
    // Requesting 2 distinct images sequentially or parallel
    const prompts = [
      `A realistic, high-quality photograph of a ${animalName} in its natural habitat, cinematic lighting.`,
      `A close-up portrait of a ${animalName}, detailed fur/skin texture, national geographic style.`
    ];

    const promises = prompts.map(async (prompt) => {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts: [{ text: prompt }] },
            config: {
                // responseMimeType is not supported for image gen models usually, they return inline data
            }
        });
        
        // Extract image from response
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part && part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        return null;
    });

    const results = await Promise.all(promises);
    results.forEach(res => {
        if (res) imageUrls.push(res);
    });

    return imageUrls;

  } catch (error) {
    console.error("Error generating similar images:", error);
    return []; // Return empty if fails, UI should handle this
  }
};

/**
 * Creates a chat session for the specific animal.
 */
export const createAnimalChat = (animalData: AnimalDetails): Chat => {
  return ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: `You are an expert zoologist. The user has just identified an animal: ${animalData.commonName} (${animalData.scientificName}). 
      Context:
      - Habitat: ${animalData.habitat}
      - Diet: ${animalData.diet}
      - Description: ${animalData.description}
      
      Answer the user's questions about this specific animal accurately and enthusiastically. Keep answers concise but informative.`,
    },
  });
};
