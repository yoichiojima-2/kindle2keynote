# kindle2keynote

Convert PDF ebooks into Marp presentation slides using AI.

## Features

- High-quality PDF text extraction using PyMuPDF and pdfplumber
- **Table extraction**: Automatically detects and formats tables as Markdown
- **Image/figure detection**: Identifies pages with images and diagrams
- AI-powered conversion to Marp slide format using Claude
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

Create a `.env` file:

```
ANTHROPIC_API_KEY=your_api_key_here
```

## Usage

```bash
# With uv
uv run main.py input.pdf output.md

# Or directly (after uv sync)
python main.py input.pdf output.md

# With different styles
uv run main.py input.pdf output.md --style minimal
uv run main.py input.pdf output.md --style academic

# Generate slides in Japanese
uv run main.py input.pdf output.md --language ja

# Control number of slides (more slides = more detail)
uv run main.py input.pdf output.md --slides 30  # More detailed
uv run main.py input.pdf output.md --slides 10  # More concise

# Extract specific page range (recommended for better table/image detection)
uv run main.py input.pdf output.md --page-range 10-50

# Use pdfplumber for better table extraction (default)
uv run main.py input.pdf output.md --extraction-method pdfplumber

# Combine options
uv run main.py input.pdf output.md --page-range 84-119 --language ja --slides 30
```

### Slide Density Guide

- `--slides 10-15`: Concise, high-level overview
- `--slides 20-30`: Balanced detail (default: 20)
- `--slides 40+`: Comprehensive, detailed presentation
```

## Project Structure

- `src/kindle2keynote/` - Main package
  - `pdf_extractor.py` - PDF text extraction utilities
  - `marp_converter.py` - LLM-based Marp conversion
- `main.py` - CLI entry point
- `pyproject.toml` - uv/pip configuration
