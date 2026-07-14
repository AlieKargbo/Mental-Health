# nlp_model.py
#import torch
#from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

# --- Configuration ---
# You can replace this with any specific fine-tuned RoBERTa model ID 
# from the Hugging Face Model Hub, especially one tuned for mood/stress.
# Example: 'finiteautomata/bertweet-base-sentiment-analysis' or a more general one.
#MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"

# --- Global Model Initialization ---
# This runs ONLY ONCE when the FastAPI server starts.
# We will use a general sentiment pipeline as a placeholder.
# In a real project, replace this with a fine-tuned mental health model.
#try:
    #print(f"Loading RoBERTa model: {MODEL_NAME}...")

    # Use the pipeline for quick, high-level analysis in a hackathon
    #sentiment_pipeline = pipeline(
        #"sentiment-analysis",
        #model=MODEL_NAME,
        #tokenizer=MODEL_NAME,
        #device=0 if torch.cuda.is_available() else -1 # Use GPU if available
    #)

    # Store the labels (e.g., ['negative', 'neutral', 'positive']) for later use
    #global_labels = sentiment_pipeline.model.config.id2label
    #print(f"Model loaded with labels: {global_labels}")

#except Exception as e:
    #print(f"Error loading RoBERTa model: {e}. Check network connection and model name.")
    #sentiment_pipeline = None
    #global_labels = {}

#def map_label_to_score(label: str, score: float) -> float:
    #"""Maps the model's categorical output (e.g., NEGATIVE) to a numerical 0.0 to 1.0 score."""
    #label = label.upper()
    
    # This mapping is arbitrary but necessary for a quantitative timeline chart.
    #if "POSITIVE" in label:
        #return score  # Closer to 1.0 is more positive
    #elif "NEGATIVE" in label:
        #return 1.0 - score  # Closer to 0.0 is more negative
    #else: # NEUTRAL, etc.
        # Neutral scores should hover near the midpoint (0.5)
        #return 0.5 + (score * 0.1) # Give it a slight boost based on confidence, but keep it centered

#def analyze_text(text: str) -> dict:
    #"""Performs RoBERTa analysis and returns scores."""
    #if not sentiment_pipeline:
        #return {"sentiment": 0.5, "intensity": 0.0}

    # 1. Run the pipeline on the input text
    #result = sentiment_pipeline(text)[0]
    
    #label = result['label']
    #raw_score = result['score']

    # 2. Map the result to our desired numerical output
    #numerical_sentiment = map_label_to_score(label, raw_score)
    
    # 3. Use the raw confidence score as a proxy for intensity/certainty
    #intensity_score = raw_score 

    # Note: For hackathon extension: You could add a separate NER model 
    # here to extract keywords like 'hopeless' or 'anxiety' for the intensity score.

    #return {
        #"sentiment": numerical_sentiment,  # A continuous score between 0.0 and 1.0
        #"intensity": intensity_score       # The confidence level of the model's prediction
    #}

# Ensure the database.py and main.py files are correctly referencing this updated 
# 'analyze_text' function and handling the float outputs. (They already do!)

#NEW CODE WITH RENDER

# nlp_model.py
import os
import requests

# --- Configuration ---
MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"
API_URL = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest"

# Get the token securely from Render's environment variables
HF_TOKEN = os.getenv("HF_TOKEN")

def map_label_to_score(label: str, score: float) -> float:
    """Maps the model's categorical output (e.g., POSITIVE/NEGATIVE/NEUTRAL) to a numerical 0.0 to 1.0 score."""
    label = label.upper()
    if "POSITIVE" in label or "LABEL_2" in label: # CardifNLP sometimes uses LABEL_2 for positive
        return score  
    elif "NEGATIVE" in label or "LABEL_0" in label: # LABEL_0 for negative
        return 1.0 - score  
    else:  
        # Neutral (LABEL_1)
        return 0.5 + (score * 0.1)

def analyze_text(text: str) -> dict:
    """Performs RoBERTa analysis via Hugging Face Inference API and returns scores."""
    if not HF_TOKEN:
        print("Warning: HF_TOKEN environment variable is not set. Using default fallback values.")
        return {"sentiment": 0.5, "intensity": 0.0}

    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {"inputs": text}

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=10.0)
        
        # If Hugging Face is still loading the model into their server cache (returns 503)
        if response.status_code == 503:
            print("Model is currently loading on Hugging Face. Returning fallback default.")
            return {"sentiment": 0.5, "intensity": 0.0}
            
        response.raise_for_status()
        result = response.json()
        
        # Hugging Face text classification returns a nested list: [[{"label": "...", "score": ...}, ...]]
        # We find the prediction with the highest confidence score
        predictions = result[0]
        top_prediction = max(predictions, key=lambda x: x['score'])
        
        label = top_prediction['label']
        raw_score = top_prediction['score']

        numerical_sentiment = map_label_to_score(label, raw_score)
        intensity_score = raw_score

        return {
            "sentiment": numerical_sentiment,
            "intensity": intensity_score
        }

    except Exception as e:
        print(f"Error calling Hugging Face API: {e}. Returning fallback defaults.")
        return {"sentiment": 0.5, "intensity": 0.0}
