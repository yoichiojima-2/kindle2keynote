# kindle2keynote

Convert PDF ebooks into Marp presentation slides using AI.

## Features

- High-quality PDF text extraction using PyMuPDF
- AI-powered conversion to Marp slide format
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
```

## Project Structure

- `src/kindle2keynote/` - Main package
  - `pdf_extractor.py` - PDF text extraction utilities
  - `marp_converter.py` - LLM-based Marp conversion
- `main.py` - CLI entry point
- `pyproject.toml` - uv/pip configuration
