"""Immutable, process-local vectors refitted when the bounded corpus changes."""

from hashlib import sha256
from threading import RLock

from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = None
_fingerprint = None
_lock = RLock()


def for_corpus(corpus):
    global vectorizer, _fingerprint
    digest = sha256("\0".join(corpus).encode()).hexdigest()
    with _lock:
        if vectorizer is None or digest != _fingerprint:
            candidate = TfidfVectorizer(stop_words="english", min_df=1, max_df=1.0)
            try:
                candidate.fit(corpus)
            except ValueError:
                return None
            vectorizer = candidate
            _fingerprint = digest
        return vectorizer


def fit_vectorizer_globally(corpus):
    return for_corpus(corpus)


def load_global_vectorizer():
    return vectorizer is not None


def get_global_vectorizer():
    return vectorizer
