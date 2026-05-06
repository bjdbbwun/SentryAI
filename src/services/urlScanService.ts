import { GoogleGenAI, Type } from "@google/genai";
import supabase from "../lib/supabase";

// Initialize Gemini AI with the API key from environment
const getAIClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export interface URLScanResult {
  verdict: "safe" | "suspicious" | "dangerous";
  risk_level: "low" | "medium" | "high" | "critical";
  threat_type: "phishing" | "scam" | "social_engineering" | "malware" | "none";
  explanation: string;
  tags: string[];
  action: "allow" | "monitor" | "report" | "block";
}

/**
 * Scans a URL for phishing, scams, and malicious intent using Gemini AI
 * @param url - The URL to scan
 * @param userId - The user ID for storing the scan history
 * @returns URLScanResult with verdict and risk assessment
 */
export async function scanURL(url: string, userId: string): Promise<URLScanResult> {
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error("Invalid URL format");
    }

    const ai = getAIClient();

    const prompt = `You are "SentryAI URL Security Scanner", a specialized AI system for analyzing URLs and web links for security threats.

Your mission: Analyze this URL for potential phishing, scams, malware, or malicious intent.

URL TO ANALYZE: "${url}"

YOUR ANALYSIS PROTOCOL:
1. EXAMINE the URL structure:
   - Domain legitimacy (check for typosquatting, lookalike domains)
   - TLD validity
   - Suspicious subdomains
   - Encoded or obfuscated characters
   - URL shorteners or redirects

2. CLASSIFY the threat:
   - Phishing: Attempts to steal credentials or personal information
   - Scam: Fraudulent schemes, fake offers, or money-making schemes
   - Social Engineering: Manipulative tactics or social manipulation
   - Malware: URLs hosting malicious software
   - None: Safe URL

3. ASSIGN a Risk Level:
   - Critical: Confirmed malicious with immediate danger
   - High: Strong indicators of malicious intent
   - Medium: Suspicious characteristics but not confirmed
   - Low: Minimal risk, appears safe

4. ASSIGN a Verdict:
   - Dangerous: Do not visit (Critical or High risk)
   - Suspicious: Exercise caution (Medium risk)
   - Safe: Can visit with normal precautions (Low risk)

5. PROVIDE an Action:
   - Block: Don't visit this URL
   - Report: Report to security authorities
   - Monitor: Keep track but can visit
   - Allow: Safe to visit

6. EXPLANATION:
   - Provide a concise explanation of your assessment (max 2 sentences)
   - Be specific about suspicious indicators if found

OUTPUT: Return ONLY a valid JSON object matching this exact schema:
{
  "verdict": "safe" | "suspicious" | "dangerous",
  "risk_level": "low" | "medium" | "high" | "critical",
  "threat_type": "phishing" | "scam" | "social_engineering" | "malware" | "none",
  "explanation": "Your analysis explanation",
  "tags": ["tag1", "tag2"],
  "action": "allow" | "monitor" | "report" | "block"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: {
              type: Type.STRING,
              enum: ["safe", "suspicious", "dangerous"],
            },
            risk_level: {
              type: Type.STRING,
              enum: ["low", "medium", "high", "critical"],
            },
            threat_type: {
              type: Type.STRING,
              enum: ["phishing", "scam", "social_engineering", "malware", "none"],
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
              enum: ["allow", "monitor", "report", "block"],
            },
          },
          required: ["verdict", "risk_level", "threat_type", "explanation", "tags", "action"],
        },
      },
    });

    const result = JSON.parse(response.text.trim()) as URLScanResult;

    // Save scan result to Supabase scan_history table
    await saveScanToDatabase(url, result, userId);

    return result;
  } catch (error) {
    console.error("URL Scan Error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to scan URL. Please try again."
    );
  }
}

/**
 * Saves the scan result to Supabase scan_history table
 */
async function saveScanToDatabase(
  url: string,
  result: URLScanResult,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase.from("scan_history").insert({
      user_id: userId,
      content_type: "url",
      content_preview: url,
      verdict: result.verdict,
      threat_type: result.threat_type,
      risk_level: result.risk_level,
      explanation: result.explanation,
    });

    if (error) {
      console.error("Database save error:", error);
      throw new Error(`Failed to save scan: ${error.message}`);
    }
  } catch (error) {
    console.error("Error saving scan to database:", error);
    // Don't throw here - the scan analysis was successful, database save is secondary
  }
}

/**
 * Retrieves scan history for a user
 */
export async function getScanHistory(userId: string, limit: number = 20) {
  try {
    const { data, error } = await supabase
      .from("scan_history")
      .select("*")
      .eq("user_id", userId)
      .eq("content_type", "url")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching scan history:", error);
    throw error;
  }
}

/**
 * Creates a high-risk alert for guardians
 */
export async function createSecurityAlert(
  userId: string,
  url: string,
  riskLevel: string,
  explanation: string
): Promise<void> {
  try {
    // Get the current user's profile to find their guardian
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("guardian_id, full_name")
      .eq("id", userId)
      .single();

    if (userError || !userData?.guardian_id) {
      console.warn("No guardian found for this user");
      return;
    }

    // Create alert for the guardian
    const { error: alertError } = await supabase.from("family_alerts").insert({
      senior_id: userId,
      guardian_id: userData.guardian_id,
      alert_type: "critical_threat",
      message: `High-risk ${riskLevel.toUpperCase()} threat detected: ${url}\n\n${explanation}`,
      is_read: false,
    });

    if (alertError) {
      console.error("Error creating security alert:", alertError);
    }
  } catch (error) {
    console.error("Error in createSecurityAlert:", error);
  }
}