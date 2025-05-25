from sklearn.feature_extraction.text import TfidfVectorizer
import pickle
import os
import logging

logger = logging.getLogger(__name__)

VECTORIZER_PATH = "global_tfidf_vectorizer.pkl"

# Initialize a global vectorizer instance
# We will fit it once or load a pre-fitted one.
vectorizer = TfidfVectorizer(stop_words='english', max_df=0.95, min_df=2) # Common parameters

def fit_vectorizer_globally(corpus: list[str]):
    """
    Fits the global vectorizer on a given corpus and saves it.
    Corpus should be a list of job text strings.
    """
    global vectorizer
    if not corpus:
        logger.warning("Cannot fit TF-IDF vectorizer on an empty corpus.")
        return
    try:
        logger.info(f"Fitting global TF-IDF vectorizer on a corpus of {len(corpus)} documents...")
        vectorizer.fit(corpus)
        with open(VECTORIZER_PATH, 'wb') as f:
            pickle.dump(vectorizer, f)
        logger.info(f"Global TF-IDF vectorizer fitted and saved to {VECTORIZER_PATH}")
    except Exception as e:
        logger.error(f"Error fitting or saving global vectorizer: {e}", exc_info=True)

def load_global_vectorizer():
    """Loads the pre-fitted global vectorizer."""
    global vectorizer
    if os.path.exists(VECTORIZER_PATH):
        try:
            with open(VECTORIZER_PATH, 'rb') as f:
                vectorizer = pickle.load(f)
            logger.info(f"Global TF-IDF vectorizer loaded from {VECTORIZER_PATH}")
            return True
        except Exception as e:
            logger.error(f"Error loading global vectorizer: {e}. Will use a new unfitted instance.", exc_info=True)
            vectorizer = TfidfVectorizer(stop_words='english', max_df=0.95, min_df=2) # Fallback
            return False
    else:
        logger.warning(f"Vectorizer file {VECTORIZER_PATH} not found. Using a new unfitted instance. Fit it soon.")
        vectorizer = TfidfVectorizer(stop_words='english', max_df=0.95, min_df=2) # Fallback
        return False

def get_global_vectorizer() -> TfidfVectorizer:
    """Returns the global vectorizer instance. Loads if not already loaded."""
    # Ensure it's loaded (or a new instance is ready if loading fails)
    if not hasattr(vectorizer, 'vocabulary_') or not vectorizer.vocabulary_:
         # Attempt to load if it seems unfitted/unloaded
        if not load_global_vectorizer():
            # If still not loaded/fitted (e.g. first run, no pickle file)
            # It will be an unfitted vectorizer. It needs to be fitted.
            # The application should handle fitting it on first substantial data.
            pass
    return vectorizer

# Attempt to load the vectorizer when this module is imported
# load_global_vectorizer() 
# Defer loading to when get_global_vectorizer is first called, or fit_vectorizer_globally
# This avoids issues if the pickle file is corrupted on startup before it can be refit.
