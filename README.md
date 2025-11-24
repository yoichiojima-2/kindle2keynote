# pdf2keynote

Convert PDF ebooks into Marp presentation slides using AI.

## Features

- High-quality PDF text extraction using PyMuPDF and pdfplumber
- **Table extraction**: Automatically detects and formats tables as Markdown
- **Image/figure detection**: Identifies pages with images and diagrams
- **AI-powered conversion**: Supports **Claude** (Anthropic), **GPT-4o** (OpenAI), and **Gemini** (Google)
- Page range selection for targeted content extraction
- Preserves document structure and formatting

## Installation

```bash
# Install dependencies with uv (recommended)
uv sync

# Or with pip
pip install -r requirements.txt
```

## Configuration

Create a `.env` file with your API keys:

```env
# At least one API key is required
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
```

## Usage

```bash
# With uv (recommended)
uv run pdf2keynote input.pdf output.md

# Or directly with python module
uv run python -m pdf2keynote.main input.pdf output.md

# Select LLM provider (default: anthropic)
uv run pdf2keynote input.pdf output.md --provider openai
uv run pdf2keynote input.pdf output.md --provider gemini

# With different styles
uv run pdf2keynote input.pdf output.md --style minimal
uv run pdf2keynote input.pdf output.md --style academic

# Generate slides in Japanese
uv run pdf2keynote input.pdf output.md --language ja

# Control number of slides (more slides = more detail)
uv run pdf2keynote input.pdf output.md --slides 30  # More detailed
uv run pdf2keynote input.pdf output.md --slides 10  # More concise

# Extract specific page range (recommended for better table/image detection)
uv run pdf2keynote input.pdf output.md --page-range 10-50

# Use pdfplumber for better table extraction (default)
uv run pdf2keynote input.pdf output.md --extraction-method pdfplumber

# Combine options
uv run pdf2keynote input.pdf output.md --page-range 84-119 --language ja --slides 30 --provider openai
```

### Slide Density Guide

- `--slides 10-15`: Concise, high-level overview
- `--slides 20-30`: Balanced detail (default: 20)
- `--slides 40+`: Comprehensive, detailed presentation
```

## Project Structure

- `src/pdf2keynote/` - Main package
  - `main.py` - CLI entry point
  - `pdf_extractor.py` - PDF text extraction utilities
  - `marp_converter.py` - LLM-based Marp conversion
  - `config.py` - Configuration management
  - `exceptions.py` - Custom exceptions
- `pyproject.toml` - uv/pip configuration
