# nlp_model.py
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

# --- Configuration ---
# You can replace this with any specific fine-tuned RoBERTa model ID 
# from the Hugging Face Model Hub, especially one tuned for mood/stress.
# Example: 'finiteautomata/bertweet-base-sentiment-analysis' or a more general one.
MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"

# --- Global Model Initialization ---
# This runs ONLY ONCE when the FastAPI server starts.
# We will use a general sentiment pipeline as a placeholder.
# In a real project, replace this with a fine-tuned mental health model.
try:
    print(f"Loading RoBERTa model: {MODEL_NAME}...")

    # Use the pipeline for quick, high-level analysis in a hackathon
    sentiment_pipeline = pipeline(
        "sentiment-analysis",
        model=MODEL_NAME,
        tokenizer=MODEL_NAME,
        device=0 if torch.cuda.is_available() else -1 # Use GPU if available
    )

    # Store the labels (e.g., ['negative', 'neutral', 'positive']) for later use
    global_labels = sentiment_pipeline.model.config.id2label
    print(f"Model loaded with labels: {global_labels}")

except Exception as e:
    print(f"Error loading RoBERTa model: {e}. Check network connection and model name.")
    sentiment_pipeline = None
    global_labels = {}

def map_label_to_score(label: str, score: float) -> float:
    """Maps the model's categorical output (e.g., NEGATIVE) to a numerical 0.0 to 1.0 score."""
    label = label.upper()
    
    # This mapping is arbitrary but necessary for a quantitative timeline chart.
    if "POSITIVE" in label:
        return score  # Closer to 1.0 is more positive
    elif "NEGATIVE" in label:
        return 1.0 - score  # Closer to 0.0 is more negative
    else: # NEUTRAL, etc.
        # Neutral scores should hover near the midpoint (0.5)
        return 0.5 + (score * 0.1) # Give it a slight boost based on confidence, but keep it centered

def analyze_text(text: str) -> dict:
    """Performs RoBERTa analysis and returns scores."""
    if not sentiment_pipeline:
        return {"sentiment": 0.5, "intensity": 0.0}

    # 1. Run the pipeline on the input text
    result = sentiment_pipeline(text)[0]
    
    label = result['label']
    raw_score = result['score']

    # 2. Map the result to our desired numerical output
    numerical_sentiment = map_label_to_score(label, raw_score)
    
    # 3. Use the raw confidence score as a proxy for intensity/certainty
    intensity_score = raw_score 

    # Note: For hackathon extension: You could add a separate NER model 
    # here to extract keywords like 'hopeless' or 'anxiety' for the intensity score.

    return {
        "sentiment": numerical_sentiment,  # A continuous score between 0.0 and 1.0
        "intensity": intensity_score       # The confidence level of the model's prediction
    }

# Ensure the database.py and main.py files are correctly referencing this updated 
# 'analyze_text' function and handling the float outputs. (They already do!)