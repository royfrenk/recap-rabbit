# Recap Rabbit 🐰

Get the "so what" of any podcast episode without listening to the whole thing.

## Features

- Search for podcast episodes or paste a direct URL
- Upload local audio files (MP3, WAV, M4A, etc.)
- Automatic transcription using OpenAI Whisper
- Speaker diarization (who said what)
- Filler word removal and cleanup
- AI-powered summarization with Claude
- Key takeaways and notable quotes

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Python FastAPI
- **Audio Processing:** OpenAI Whisper (large-v3), PyAnnote
- **Summarization:** Anthropic Claude

## Prerequisites

- Node.js 18+
- Python 3.10+
- FFmpeg installed on your system
- API keys (see Environment Variables)

## Setup

### 1. Clone and navigate to the project

```bash
cd ~/projects/podcatchup
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template and add your keys
cp .env.example .env
# Edit .env with your API keys
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

## Environment Variables

Create a `.env` file in the `backend` directory:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
LISTEN_NOTES_API_KEY=your_listen_notes_api_key  # Optional, for podcast search
HUGGINGFACE_TOKEN=your_huggingface_token        # Required for speaker diarization
```

### Getting API Keys

- **Anthropic:** Get your API key at https://console.anthropic.com/
- **HuggingFace:** Create a token at https://huggingface.co/settings/tokens (required to download PyAnnote models)
- **Listen Notes:** (Optional) Get an API key at https://www.listennotes.com/api/

## Running the Application

### Start the Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

### Start the Frontend

```bash
cd frontend
npm run dev
```

The app will be available at http://localhost:3000

## Usage

1. **Search for a podcast:** Type a podcast name or topic in the search bar
2. **Paste a URL:** Paste a direct link to a podcast episode audio file
3. **Upload a file:** Drag and drop or click to upload a local audio file

Processing takes a few minutes depending on the episode length. You'll see:
- A paragraph summary
- Key takeaways as bullet points
- Notable quotes with speaker attribution
- Full transcript with speaker labels

## Notes

- First run will download Whisper and PyAnnote models (~3GB)
- Processing time: ~1-2 min per 10 min of audio on CPU
- GPU acceleration (CUDA) significantly speeds up processing
- Supports episodes up to 3 hours in length
