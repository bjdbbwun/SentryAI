import { GoogleGenAI } from '@google/genai';

// Use Vite's environment variable format
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export interface ScanResult {
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  classification: string;
  explanation: string;
  tags: string[];
  action: string;
}

export async function scanText(text: string, preferredLanguage: string = 'en'): Promise<ScanResult> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following text for potential security risks, scams, or malicious intent: "${text}". Preferred response language: ${preferredLanguage}.`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    // Fixed: response.text is a property in latest SDK
    const responseText = (response as { text?: string | null }).text?.trim() || '{}';
    const result = JSON.parse(responseText);

    return result as ScanResult;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return {
      risk: "Low",
      classification: "Safe",
      explanation: "Analysis failed or timed out.",
      tags: ["Error"],
      action: "Please try again."
    };
  }
}

export async function familyGuardianAnalysis(
  seniorName: string,
  recentThreats: any[],
  language: string = 'en'
): Promise<string> {
  const prompt = `You are the guardian report generator for Obitrex.

Senior: ${seniorName}
Recent threats:
${JSON.stringify(recentThreats, null, 2)}

Provide a concise, actionable safety report for the guardian in ${language}. Keep it short, clear, and practical.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = (response as { text?: string | null }).text?.trim();
    return responseText || `No guardian report was generated for ${seniorName}.`;
  } catch (error) {
    console.error('Failed to generate guardian analysis:', error);
    return language === 'Arabic'
      ? 'تعذر إنشاء تقرير الحماية في الوقت الحالي.'
      : `Could not generate a guardian report for ${seniorName} right now.`;
  }
}