
import { GoogleGenAI, Type } from "@google/genai";

export const getNetworkInsights = async (networkData: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this mesh topology as the AsTrA operator subsystem. 
    You are reporting to the main operator. Use calm, technical, infrastructure-level language.
    Network Data: ${JSON.stringify(networkData)}
    
    Identify topological risks, bottleneck nodes, and service distribution.
    Format as a high-level operational briefing.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Analysis link nominal. No topological anomalies detected.";
  } catch (error) {
    console.error("AsTrA Logic Core Error:", error);
    return "Heuristic engine offline. Analyzing via fallback patterns.";
  }
};

export const generateReport = async (peers: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `As AsTrA, generate a mission log for this topology state: ${JSON.stringify(peers)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          riskLevel: { type: Type.STRING },
          actionItems: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["summary", "riskLevel", "actionItems"]
      }
    }
  });
  
  const jsonStr = response.text || "{}";
  return JSON.parse(jsonStr);
};

export const generateConceptArt = async (): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'A high-tech futuristic nebula visualization representing a peer-to-peer network mesh. Glowing nodes connected by data streams in deep space. Cinematic lighting, professional digital art, indigo and cyan color palette, 16:9 ratio.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  const candidates = response.candidates;
  if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("Topological visualization failed.");
};
