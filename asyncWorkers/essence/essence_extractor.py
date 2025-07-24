import re
import math
from typing import List, Dict, Optional
from collections import Counter
from functools import lru_cache

class EssenceExtractor:
    def __init__(self, stopwords: Optional[List[str]] = None):
        self.stopwords = set(stopwords or [])

    @lru_cache(maxsize=128)
    def tokenize_sentences(self, text: str) -> List[str]:
        # split on sentence-ending punctuation followed by whitespace
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s for s in sentences if s]

    @lru_cache(maxsize=1024)
    def tokenize_words(self, sentence: str) -> List[str]:
        words = re.findall(r'\b\w+\b', sentence.lower())
        return [w for w in words if w not in self.stopwords]

    def sentence_scores(self, sentences: List[str]) -> Dict[int, float]:
        # build normalized word frequencies
        all_words = [w for sent in sentences for w in self.tokenize_words(sent)]
        freq = Counter(all_words)
        if not freq:
            return {}
        max_freq = max(freq.values())
        for w in freq:
            freq[w] /= max_freq

        # score each sentence by summing word frequencies
        scores: Dict[int, float] = {}
        for idx, sent in enumerate(sentences):
            scores[idx] = sum(freq.get(w, 0) for w in self.tokenize_words(sent))
        return scores

    def extract(self, text: str, ratio: float = 0.2, min_sentence_length: int = 20) -> List[str]:
        sentences = self.tokenize_sentences(text)
        # filter out too-short sentences
        sentences = [s for s in sentences if len(s) >= min_sentence_length]
        if not sentences:
            return []
        scores = self.sentence_scores(sentences)
        # number of sentences to select
        n = max(1, math.ceil(len(sentences) * ratio))
        # pick top-n by score
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:n]
        # return in original order
        selected = sorted(idx for idx, _ in ranked)
        return [sentences[i] for i in selected]

    def split_paragraphs(self, text: str) -> List[str]:
        return [p.strip() for p in text.split('\n\n') if p.strip()]

    def extract_by_paragraph(self, text: str, top_n: int = 1, ratio: float = 0.2) -> List[str]:
        paras = self.split_paragraphs(text)
        result: List[str] = []
        for p in paras:
            # adjust ratio so we pick at least top_n sentences per paragraph
            num_sents = len(self.tokenize_sentences(p))
            use_ratio = min(1.0, max(ratio, top_n / max(1, num_sents)))
            result.extend(self.extract(p, ratio=use_ratio))
        return result
