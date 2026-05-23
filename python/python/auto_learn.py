# python/auto_learn.py
# Extract new fraud patterns from collected data

import json
import re
from datetime import datetime
from collections import Counter
from typing import List, Dict

class PatternLearner:
    """Learns new fraud patterns from collected threats"""
    
    def __init__(self, threats_file: str = "data/threats.json"):
        try:
            with open(threats_file, 'r') as f:
                self.threats = json.load(f)
            print(f"✅ Loaded {len(self.threats)} threats")
        except FileNotFoundError:
            print(f"❌ File {threats_file} not found. Run collector first.")
            self.threats = []
    
    def extract_dangerous_tlds(self) -> List[str]:
        """Extract most common dangerous TLDs"""
        tlds = []
        for threat in self.threats:
            url = threat.get('url', '')
            match = re.search(r'\.([a-z]{2,6})(?:/|$)', url)
            if match:
                tlds.append(match.group(1))
        
        tld_counter = Counter(tlds)
        dangerous = [tld for tld, count in tld_counter.most_common(15) if count > 2]
        print(f"🔍 Dangerous TLDs: {dangerous}")
        return dangerous
    
    def extract_suspicious_patterns(self) -> List[str]:
        """Extract recurring text patterns in URLs"""
        patterns = []
        common_keywords = [
            'verify', 'confirm', 'login', 'secure', 'update', 
            'account', 'alert', 'security', 'bank', 'paypal',
            'amazon', 'apple', 'microsoft', 'dhl', 'fedex'
        ]
        
        for threat in self.threats:
            url = threat.get('url', '').lower()
            for kw in common_keywords:
                if kw in url:
                    patterns.append(kw)
        
        pattern_counter = Counter(patterns)
        top_patterns = [p for p, count in pattern_counter.most_common(10) if count > 3]
        print(f"🔍 Suspicious patterns: {top_patterns}")
        return top_patterns
    
    def extract_typo_brands(self) -> Dict[str, List[str]]:
        """Extract brand typosquatting attempts"""
        brand_typos = {
            'amazon': ['amaz0n', 'amazoon', 'amazom', 'amzn', 'amazom'],
            'paypal': ['paypa1', 'pay-pal', 'paypall', 'paypel', 'paypai'],
            'google': ['go0gle', 'g00gle', 'googel', 'goog1e', 'goggle'],
            'microsoft': ['micr0soft', 'micros0ft', 'microsoftt', 'micros0ft'],
            'facebook': ['faceb00k', 'faceboook', 'facebo0k', 'fb-login'],
            'apple': ['app1e', 'appple', 'appIe', 'appleid'],
            'dhl': ['dhl-express', 'dhl.com-security', 'dh1'],
            'fedex': ['fed-ex', 'fedexx', 'fed3x'],
            'netflix': ['netfl1x', 'netfIix', 'netfix'],
            'instagram': ['instagr4m', 'insta-login', 'ig-verify'],
        }
        
        found = {}
        for threat in self.threats:
            url = threat.get('url', '').lower()
            for brand, typos in brand_typos.items():
                for typo in typos:
                    if typo in url:
                        if brand not in found:
                            found[brand] = []
                        if typo not in found[brand]:
                            found[brand].append(typo)
        
        if found:
            print(f"🔍 Brand typos detected: {found}")
        return found
    
    def extract_suspicious_words_from_content(self) -> List[str]:
        """Extract suspicious words from URLs"""
        suspicious_words = [
            'verify', 'confirm', 'update', 'suspend', 'deactivate',
            'unusual', 'activity', 'security', 'alert', 'warning',
            'login', 'signin', 'password', 'credential', 'banking',
            'ssn', 'bitcoin', 'wallet', 'crypto'
        ]
        
        found_words = []
        for threat in self.threats:
            url = threat.get('url', '').lower()
            for word in suspicious_words:
                if word in url and word not in found_words:
                    found_words.append(word)
        
        print(f"🔍 Suspicious words found: {found_words[:15]}")
        return found_words
    
    def generate_report(self) -> Dict:
        """Generate complete report of new patterns"""
        if not self.threats:
            print("❌ No threats to analyze")
            return {}
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_threats_analyzed': len(self.threats),
            'dangerous_tlds': self.extract_dangerous_tlds(),
            'suspicious_patterns': self.extract_suspicious_patterns(),
            'typo_brands': self.extract_typo_brands(),
            'suspicious_words': self.extract_suspicious_words_from_content(),
            'sources_summary': self._get_sources_summary()
        }
        
        # Save report
        import os
        os.makedirs("data", exist_ok=True)
        
        with open('data/patterns_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📊 Report saved to data/patterns_report.json")
        return report
    
    def _get_sources_summary(self) -> Dict[str, int]:
        """Get count of threats per source"""
        sources = {}
        for threat in self.threats:
            source = threat.get('source', 'unknown')
            sources[source] = sources.get(source, 0) + 1
        return sources

if __name__ == "__main__":
    learner = PatternLearner()
    if learner.threats:
        learner.generate_report()
    else:
        print("Run python/collector.py first to gather data")