#!/usr/bin/env python3
"""
Simple script to start the FastAPI server with proper configuration.
Run this instead of manually typing the uvicorn command.
"""

import os
import uvicorn

if __name__ == "__main__":
    # Cloud Run passes the port dynamically. We must read it.
    port = int(os.environ.get("PORT", 8080))
    
    # You MUST bind to 0.0.0.0 so external traffic can reach it
    uvicorn.run("main:app", host="0.0.0.0", port=port)
