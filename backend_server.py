# backend_server.py
# MODULE 5: Backend Server (FastAPI)
# Receives handwriting data and images, saves with clean folder structure.

from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import json
from datetime import datetime

DATA_ROOT = 'handwriting_data'
META_FILE = os.path.join(DATA_ROOT, 'metadata.json')

app = FastAPI()

# Enable CORS for all origins (for local tablet access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Ensure data root exists
os.makedirs(DATA_ROOT, exist_ok=True)

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.post('/save_stroke_data')
async def save_stroke_data(request: Request):
    try:
        data = await request.json()
        label = data.get('label', 'unknown')
        timestamp = data.get('timestamp', datetime.utcnow().isoformat())
        folder = os.path.join(DATA_ROOT, label)
        os.makedirs(folder, exist_ok=True)
        fname = timestamp.replace(':', '').replace('-', '').replace('T', '_').split('.')[0]
        json_path = os.path.join(folder, f'{fname}.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        # Stub: metadata tracking (Module 7)
        # Stub: image processing (Module 6)
        return {'status': 'saved', 'json_path': json_path}
    except Exception as e:
        return JSONResponse(status_code=400, content={'error': str(e)})

@app.post('/upload_png')
async def upload_png(file: UploadFile = File(...), label: str = Form('unknown'), timestamp: str = Form(None)):
    try:
        folder = os.path.join(DATA_ROOT, label)
        os.makedirs(folder, exist_ok=True)
        if not timestamp:
            timestamp = datetime.utcnow().isoformat()
        fname = timestamp.replace(':', '').replace('-', '').replace('T', '_').split('.')[0]
        png_path = os.path.join(folder, f'{fname}.png')
        with open(png_path, 'wb') as f:
            content = await file.read()
            f.write(content)
        # Stub: metadata tracking (Module 7)
        # Stub: image processing (Module 6)
        return {'status': 'saved', 'png_path': png_path}
    except Exception as e:
        return JSONResponse(status_code=400, content={'error': str(e)})

@app.get("/")
def root():
    return {"message": "Handwriting Data Collector Backend is running."}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000) 