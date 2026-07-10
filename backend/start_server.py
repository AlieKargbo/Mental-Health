#!/usr/bin/env python3
"""
Simple script to start the FastAPI server with proper configuration.
Run this instead of manually typing the uvicorn command.
"""

import uvicorn
import os

if __name__ == "__main__":
    # Start the FastAPI server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )