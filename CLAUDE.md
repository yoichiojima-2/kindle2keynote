# kindle2keynote

## overview

Convert PDF ebooks into Marp presentation slides using AI.

## implementation

- PDF text extraction using PyMuPDF (primary) and pdfplumber (fallback)
- LLM-based conversion to Marp format using Claude Sonnet
- CLI tool with multiple presentation styles

## development guidelines

- Use `uv` for dependency management
- Commit and push regularly
- Maintain clean code structure in `src/kindle2keynote/`