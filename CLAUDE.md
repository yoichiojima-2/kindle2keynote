# kindle2keynote

## overview

Convert PDF ebooks into Marp presentation slides using AI.

## implementation

- PDF text extraction using PyMuPDF (primary) and pdfplumber (fallback)
- LLM-based conversion to Marp format using Claude Sonnet
- CLI tool with multiple presentation styles

## current work

- Target book: `assets/books/the-complete-book-of-product-management.pdf` (pages 84-107)
- Note: PDF page numbers include index/front matter, so actual content pages differ from PDF page numbers

## development guidelines

- Use `uv` for dependency management
- Commit and push regularly
- Maintain clean code structure in `src/kindle2keynote/`
- **Tests are always required** - write tests for all new features and bug fixes