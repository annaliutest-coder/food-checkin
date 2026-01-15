
import { GoogleGenAI } from "@google/genai";

/**
 * Generates a social media recommendation text using Gemini API.
 */
export const getGourmetResponse = async (nickname: string, country: string, feedbackContext: string, day: string): Promise<string> => {
  try {
    // Correct initialization using process.env.API_KEY as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Using gemini-3-flash-preview for basic text task as per guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位「國際週社群小編」。
      顧客（暱稱: ${nickname}）在國際週的 ${day} 吃了「${country}」的小吃。
      他的反饋是：${feedbackContext}。
      請根據以上資訊，寫一段「適合發在 IG/FB 動態」的超級推薦語（25字以內）。
      語氣要非常興奮、有吸引力，像是發現了隱藏美食一樣。
      必須包含：該國家名稱、活動天數、以及一個關於味道的正評。
      請使用台灣繁體中文，加上亮眼的 Emoji 📸🔥🌟`,
      config: {
        temperature: 1.0,
        topP: 0.9,
      }
    });

    // Directly access .text property as it is a getter, not a method.
    return response.text || `國際週 ${day} 必吃！${country} 的美味讓我瞬間飛到異國，大家快來！✈️🍴`;
  } catch (error) {
    console.error("Gemini service error:", error);
    return `國際週 ${day} 驚喜發現！${country} 的小吃真的很有誠意，推一個！👍❤️`;
  }
};
