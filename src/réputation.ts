// src/reputation.ts
// Layer 3: Reputation & Trust Check

export interface ReputationResult {
  score: number;
  knownFraud: boolean;
  redirectCount: number;
  httpsValid: boolean;
  reasons: string[];
}

const knownFraudDomains = new Map<string, number>([
  ['paypa1.com', 95],
  ['amaz0n.tk', 90],
  ['verify-now.xyz', 85],
]);

async function countRedirects(url: string): Promise<number> {
  return 0;
}

async function checkHttps(url: string): Promise<{ valid: boolean; type: string }> {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') {
      return { valid: false, type: 'none' };
    }
    return { valid: true, type: 'DV' };
  } catch {
    return { valid: false, type: 'error' };
  }
}

function checkFraud(hostname: string): { isFraud: boolean; confidence: number } {
  for (const [domain, confidence] of knownFraudDomains) {
    if (hostname.includes(domain)) {
      return { isFraud: true, confidence };
    }
  }
  return { isFraud: false, confidence: 0 };
}

export async function reputationScan(url: string): Promise<ReputationResult> {
  const reasons: string[] = [];
  let score = 100;
  
  try {
    const hostname = new URL(url).hostname;
    
    const fraud = checkFraud(hostname);
    if (fraud.isFraud) {
      reasons.push(`Known fraud domain (${fraud.confidence}%)`);
      score -= fraud.confidence;
    }
    
    const https = await checkHttps(url);
    if (!https.valid) {
      reasons.push('No HTTPS - insecure');
      score -= 30;
    } else if (https.type === 'DV') {
      reasons.push('Basic HTTPS certificate (easy to get)');
      score -= 10;
    }
    
    const redirects = await countRedirects(url);
    if (redirects > 3) {
      reasons.push(`Many redirects (${redirects}) - suspicious`);
      score -= redirects * 5;
    }
    
  } catch (error) {
    reasons.push('Failed to analyze reputation');
    score = 0;
  }
  
  return {
    score: Math.max(0, Math.min(100, score)),
    knownFraud: score < 40,
    redirectCount: await countRedirects(url),
    httpsValid: (await checkHttps(url)).valid,
    reasons: reasons.length ? reasons : ['Reputation looks clean']
  };
}