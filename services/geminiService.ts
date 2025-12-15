import { GoogleGenAI } from "@google/genai";
import { Rank } from "../types";

const SYSTEM_INSTRUCTION = `
You are "The System" from a gamified fitness app inspired by Solo Leveling.
Your tone is robotic, authoritative, slightly menacing but ultimately encouraging in a "survival of the fittest" way.
Keep responses short, cryptic, and impactful.
You are speaking to a "Hunter".
`;

export const getDailyBriefing = async (rank: Rank, streak: number): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "SYSTEM OFFLINE. LOCAL PROTOCOLS ENGAGED.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      The Hunter is Rank ${rank}.
      Current Survival Streak: ${streak} days.
      Generate a 1-sentence "System Message" for the daily login.
      If streak is 0, warn them.
      If streak is high (>3), acknowledge their power.
      Do not use exclamation marks excessively.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 50,
        temperature: 0.7,
      }
    });

    return response.text.trim();

  } catch (error) {
    console.error("Gemini Error:", error);
    return "CONNECTION TO MONARCH SERVER UNSTABLE.";
  }
};
