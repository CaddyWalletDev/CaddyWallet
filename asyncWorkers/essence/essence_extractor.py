
import re
import math
from typing import List, Tuple, Dict

class EssenceExtractor:
    def __init__(self, stopwords: List[str] = None):
        self.stopwords = set(stopwords or [])

    def tokenize_sentences(self, text: str) -> List[str]:
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s for s in sentences if s]

    def tokenize_words(self, sentence: str) -> List[str]:
        words = re.findall(r'\b\w+\b', sentence.lower())
        return [w for w in words if w not in self.stopwords]

    def sentence_scores(self, sentences: List[str]) -> Dict[int, float]:
        word_freq: Dict[str, int] = {}
        for sent in sentences:
            for w in self.tokenize_words(sent):
                word_freq[w] = word_freq.get(w, 0) + 1
        max_freq = max(word_freq.values(), default=1)
        for w in word_freq:
            word_freq[w] /= max_freq

        scores: Dict[int, float] = {}
        for i, sent in enumerate(sentences):
            for w in self.tokenize_words(sent):
                scores[i] = scores.get(i, 0) + word_freq.get(w, 0)
        return scores

    def extract(self, text: str, ratio: float = 0.2) -> List[str]:
        sentences = self.tokenize_sentences(text)
        if not sentences:
            return []
        scores = self.sentence_scores(sentences)
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        select_count = max(1, math.ceil(len(sentences) * ratio))
        selected_idx = sorted(idx for idx, _ in ranked[:select_count])
        return [sentences[i] for i in selected_idx]

    def split_paragraphs(self, text: str) -> List[str]:
        return [p.strip() for p in text.split('\n\n') if p.strip()]

    def extract_by_paragraph(self, text: str, top_n: int = 1) -> List[str]:
        paras = self.split_paragraphs(text)
        result: List[str] = []
        for p in paras:
            top = self.extract(p, ratio=top_n / max(1, len(self.tokenize_sentences(p))))
            result.extend(top)
        return result
