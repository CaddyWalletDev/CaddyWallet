

from typing import List, Dict
from collections import Counter
import heapq

class EssenceSummarizer:
    def __init__(self, max_keywords: int = 10):
        self.max_keywords = max_keywords

    def frequency_keywords(self, text: str) -> List[str]:
        words = [w.lower() for w in text.split() if w.isalpha()]
        freq = Counter(words)
        return [w for w, _ in freq.most_common(self.max_keywords)]

    def rich_context(self, text: str) -> Dict[str, List[str]]:
        sentences = text.split('.')
        context: Dict[str, List[str]] = {}
        for word in self.frequency_keywords(text):
            context[word] = [s.strip() for s in sentences if word in s.lower()][:3]
        return context

    def summarize(self, sentences: List[str], max_len: int = 3) -> List[str]:
        if not sentences:
            return []
        lengths = [len(s.split()) for s in sentences]
        avg_len = sum(lengths) / len(lengths)
        heap = [(abs(len(s.split()) - avg_len), i) for i, s in enumerate(sentences)]
        best = heapq.nsmallest(min(max_len, len(sentences)), heap)
        return [sentences[i] for _, i in best]

    def full_summary(self, text: str) -> Dict[str, any]:
        extractor = __import__('essence_extractor').essence_extractor.EssenceExtractor()
        key_sents = extractor.extract(text, ratio=0.15)
        keywords = self.frequency_keywords(text)
        context = self.rich_context(text)
        summary = self.summarize(key_sents)
        return {
            'summary_sentences': summary,
            'keywords': keywords,
            'keyword_context': context
        }
