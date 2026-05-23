import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ScanResult {
  risk: "High" | "Medium" | "Low";
  classification: "Phishing" | "Scam" | "Social Engineering" | "Safe";
  explanation: string;
  tags: string[];
  action: "Block/Ignore" | "Monitor" | "Allow" | "Report";
  detectedLanguage?: string;
  emailMetadata?: {
    sender?: string;
    recipient?: string;
    subject?: string;
    body?: string;
  };
}

export async function scanText(text: string, preferredLanguage: string = "Auto"): Promise<ScanResult> {
  const prompt = `You are "SentryAI Forensic Scanner", a state-of-the-art cyber-intelligence system. Your mission is to analyze digital communications (emails, SMS, chat messages) for security threats.

  YOUR ANALYSIS PROTOCOL:
  1. IDENTIFY the core intent of the message.
  2. CLASSIFY the threat level into exactly one of these FOUR categories for the UI table:
     - Phishing: Attempts to steal credentials, login info, or sensitive data.
     - Scam: Fraudulent schemes, fake winnings, investment fraud, or non-delivery of services.
     - Social Engineering: Manipulative tactics like impersonation, urgency traps, or emotional blackmail.
     - Safe: Legitimate communication with no detectable malicious intent.

  3. ASSIGN a Risk Level:
     - High: Confirmed malicious intent or extremely suspicious patterns.
     - Medium: Unverified content with suspicious elements or unknown senders.
     - Low: Content appears safe but requires standard caution.

  4. PROVIDE a detailed Explanation:
     - Brief English explanation of the threat (max 2 sentences).

  5. RECOMMEND an Action:
     - "Block/Ignore" for High risk threats.
     - "Report" for suspicious content.
     - "Monitor" for Medium risk.
     - "Allow" for Safe content.

  ## CRITICAL: WHATSAPP VERIFICATION CODE RULE
  A WhatsApp verification code message has this EXACT format:
  - "WhatsApp verification code: [6-8 digits]. If you didn't request this, ignore."
  - OR "Your WhatsApp code: [6-8 digits]"
  - OR "Your WhatsApp account is being registered on a new device. Code: [6-8 digits]"

  IF a message matches this pattern AND contains NO links, NO request for money, NO request to forward the code:
  THEN verdict MUST be:
  - classification: "Safe"
  - risk: "Low"
  - explanation: "Official WhatsApp security message. This is a legitimate verification code transmitted by WhatsApp's authentication server."
  - tags: ["Official Alert", "Authentication"]
  - action: "Allow"

  Content for analysis: "${text}"

  OUTPUT FORMAT:
  - You MUST output raw JSON.
  - Return ONLY a raw JSON object matching this schema:
  {
    "risk": "High | Medium | Low",
    "classification": "Phishing | Scam | Social Engineering | Safe",
    "explanation": "Brief English explanation of the threat.",
    "tags": ["Financial Scam", "Urgent", "Suspicious Link"],
    "action": "Block/Ignore | Report | Monitor | Allow"
  }`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          risk: {
            type: Type.STRING,
            enum: ["High", "Medium", "Low"],
          },
          classification: {
            type: Type.STRING,
            enum: ["Phishing", "Scam", "Social Engineering", "Safe"],
          },
          explanation: {
            type: Type.STRING,
          },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          action: {
            type: Type.STRING,
          }
        },
        required: ["risk", "classification", "explanation", "tags", "action"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text.trim());
    return result as ScanResult;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return {
      risk: "Low",
      classification: "Safe",
      explanation: "Analysis failed due to technical error.",
      tags: [],
      action: "Allow"
    };
  }
}

export async function familyGuardianAnalysis(seniorName: string, recentThreats: any[], language: string = "English"): Promise<string> {
  const prompt = `You are "SentryAI Family Shield", the guardian module for SentryAI.
  
  You are reporting to the "Guardian" about their family member: "${seniorName}".
  
  Recent Threats Detected for ${seniorName}:
  ${JSON.stringify(recentThreats, null, 2)}
  
  YOUR MISSION:
  1. Provide a clear, actionable overview of ${seniorName}'s security status.
  2. Explain the nature of the threats in simple, non-technical terms for the family.
  3. Suggest immediate protective actions the Guardian should take.
  
  TONE: Protective, professional, empathetic, and clear.
  LANGUAGE: Respond in ${language}.
  
  STRICT LANGUAGE CONSISTENCY POLICY (CRITICAL):
  1. RESPOND ENTIRELY in ${language}. 
  2. NEVER mix languages in this report.
  3. ARABIC RULES: 
     - Use Modern Standard Arabic (فصحى) only. 
     - NO Moroccan Darija, NO Dialects. 
     - NO Franco-Arab.
     - NO mixing with French or English words.
  4. OTHER LANGUAGES: Use standard/formal versions.
  5. VIOLATION CHECK: Verify that the report is 100% in ONE language only.
  
  FORMAT: Use bullet points and clear headings. Keep it under 300 words.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text.trim();
}
