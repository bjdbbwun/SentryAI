import supabase from '../lib/supabase';

// Homograph attack detection: Check for lookalike characters in URLs
export function detectHomographAttack(url: string): boolean {
  // Common lookalike mappings (simplified)
  const lookalikes: { [key: string]: string } = {
    'а': 'a', // Cyrillic a
    'е': 'e', // Cyrillic e
    'о': 'o', // Cyrillic o
    'р': 'p', // Cyrillic p
    'с': 'c', // Cyrillic c
    'у': 'y', // Cyrillic y
    'х': 'x', // Cyrillic x
    // Add more as needed
  };

  const domain = extractDomain(url);
  for (const char of domain) {
    if (lookalikes[char]) {
      return true; // Potential homograph
    }
  }
  return false;
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

// Check SSL status: Try HTTPS and see if it works
export async function checkSSLStatus(url: string): Promise<boolean> {
  const domain = extractDomain(url);
  if (!domain) return false;
  try {
    const response = await fetch(`https://${domain}`, { method: 'HEAD', mode: 'no-cors' });
    return true; // If no error, assume SSL is valid (simplified)
  } catch {
    return false;
  }
}

// Domain Age check: This requires an external API, placeholder
export async function checkDomainAge(domain: string): Promise<number | null> {
  // In a real implementation, use a WHOIS API like https://www.whoisxmlapi.com/
  // For now, return null or a mock
  // Example: fetch(`https://api.whoisxmlapi.com/v1?apiKey=KEY&domainName=${domain}`)
  // Parse creation date and calculate age in days
  return null; // Placeholder
}

// Redirection Tracker: Follow redirects and return final URL
export async function trackRedirections(url: string): Promise<string> {
  try {
    const response = await fetch(url, { redirect: 'follow' });
    return response.url;
  } catch {
    return url; // If error, return original
  }
}

// Main fraud detection function
export async function detectFraud(url: string, userId: string): Promise<void> {
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let threatType = 'none';
  let explanation = '';

  // Check homograph
  if (detectHomographAttack(url)) {
    riskLevel = 'high';
    threatType = 'homograph';
    explanation += 'Homograph attack detected: lookalike characters in domain. ';
  }

  // Check SSL
  const sslValid = await checkSSLStatus(url);
  if (!sslValid) {
    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
    threatType = threatType === 'none' ? 'ssl_invalid' : threatType;
    explanation += 'SSL certificate invalid or missing. ';
  }

  // Check domain age
  const domain = extractDomain(url);
  const age = await checkDomainAge(domain);
  if (age !== null && age < 30) { // Less than 30 days old
    riskLevel = 'high';
    threatType = 'new_domain';
    explanation += 'Domain is very new, potential scam. ';
  }

  // Track redirections
  const finalUrl = await trackRedirections(url);
  if (finalUrl !== url) {
    explanation += `Redirects to: ${finalUrl}. `;
    // Additional checks on final URL if needed
  }

  // If suspicious, save to fraud_log
  if (riskLevel !== 'low') {
    await supabase.from('fraud_log').insert({
      user_id: userId,
      url,
      risk_level: riskLevel,
      threat_type: threatType,
      explanation: explanation.trim(),
    });
  }
}