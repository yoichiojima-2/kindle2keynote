# kindle2keynote

Convert PDF ebooks into Marp presentation slides using AI.

## Features

- High-quality PDF text extraction using PyMuPDF
- AI-powered conversion to Marp slide format
- Preserves document structure and formatting

## Installation

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration

Create a `.env` file:

```
ANTHROPIC_API_KEY=your_api_key_here
```

## Usage

```bash
python main.py input.pdf output.md
```

## Project Structure

- `pdf_extractor.py` - PDF text extraction utilities
- `marp_converter.py` - LLM-based Marp conversion
- `main.py` - CLI entry point
