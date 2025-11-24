#!/usr/bin/env python3
"""
pdf2keynote - Convert PDF ebooks to Marp presentations

Usage:
    python main.py input.pdf output.md [--style default|minimal|academic]
"""

import argparse
import logging
import sys
from pathlib import Path

from pdf2keynote.config import settings
from pdf2keynote.exceptions import PDF2KeynoteError
from pdf2keynote.pdf_extractor import PDFExtractor
from pdf2keynote.marp_converter import MarpConverter
import fitz  # PyMuPDF

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(
        description="Convert PDF ebooks to Marp presentation slides"
    )
    parser.add_argument(
        "input_pdf",
        help="Path to the input PDF file"
    )
    parser.add_argument(
        "output_marp",
        help="Path to the output Marp markdown file"
    )
    parser.add_argument(
        "--style",
        choices=["default", "minimal", "academic"],
        default=settings.default_style,
        help=f"Presentation style (default: {settings.default_style})"
    )
    parser.add_argument(
        "--extraction-method",
        choices=["auto", "pymupdf", "pdfplumber"],
        default="pdfplumber",
        help="PDF extraction method (default: pdfplumber for better table support)"
    )
    parser.add_argument(
        "--save-text",
        help="Optional path to save extracted text"
    )
    parser.add_argument(
        "--page-range",
        help="Page range to extract (e.g., '66-100' or '10-20')"
    )
    parser.add_argument(
        "--language",
        choices=["en", "ja"],
        default=settings.default_language,
        help=f"Output language for Marp slides (en: English, ja: Japanese, default: {settings.default_language})"
    )
    parser.add_argument(
        "--slides",
        type=int,
        default=settings.default_slides,
        help=f"Target number of slides (default: {settings.default_slides}, more slides = more detail)"
    )
    parser.add_argument(
        "--provider",
        choices=["anthropic", "openai", "gemini"],
        default=settings.default_provider,
        help=f"LLM provider (default: {settings.default_provider})"
    )

    args = parser.parse_args()

    # Validate input file
    input_path = Path(args.input_pdf)
    if not input_path.exists():
        logger.error(f"Input file not found: {args.input_pdf}")
        sys.exit(1)

    if input_path.suffix.lower() != ".pdf":
        logger.error(f"Input file must be a PDF: {args.input_pdf}")
        sys.exit(1)

    try:
        # Parse page range if provided
        page_range = None
        if args.page_range:
            try:
                parts = args.page_range.split('-')
                if len(parts) != 2:
                    raise ValueError("Page range must be in format 'start-end'")
                start_page = int(parts[0].strip())
                end_page = int(parts[1].strip())
                if start_page < 1 or end_page < start_page:
                    raise ValueError("Invalid page range")
                page_range = (start_page, end_page)
                logger.info(f"Extracting pages {start_page}-{end_page}")
            except ValueError as e:
                logger.error(f"Invalid page range format: {e}")
                sys.exit(1)

        # Check page count and warn if large
        try:
            with fitz.open(input_path) as doc:
                total_pages = len(doc)
                if total_pages > 50 and not page_range:
                    logger.warning(f"PDF has {total_pages} pages. Processing the entire document may be slow.")
                    logger.warning("Consider using --page-range to extract specific chapters (e.g., --page-range 10-30).")
        except Exception:
            pass  # Ignore errors here, let extractor handle it

        # Step 1: Extract text from PDF
        logger.info(f"Extracting text from PDF: {args.input_pdf}")
        extractor = PDFExtractor(args.input_pdf)
        text_content = extractor.extract(method=args.extraction_method, page_range=page_range)

        if not text_content.strip():
            logger.error("No text could be extracted from the PDF")
            sys.exit(1)

        logger.info(f"Successfully extracted {len(text_content)} characters")

        # Optionally save extracted text
        if args.save_text:
            Path(args.save_text).write_text(text_content, encoding="utf-8")
            logger.info(f"Extracted text saved to: {args.save_text}")

        # Step 2: Convert to Marp
        logger.info(f"Converting to Marp presentation (style: {args.style}, language: {args.language}, target slides: {args.slides}, provider: {args.provider})...")
        converter = MarpConverter(provider=args.provider)
        marp_content = converter.convert_to_marp(text_content, style=args.style, language=args.language, target_slides=args.slides)

        # Step 3: Save output
        output_path = Path(args.output_marp)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(marp_content, encoding="utf-8")

        logger.info(f"Marp presentation saved to: {args.output_marp}")
        print("\nConversion completed successfully!")
        print(f"\nTo view the presentation, use Marp CLI or VS Code with Marp extension:")
        print(f"  marp {args.output_marp}")

    except PDF2KeynoteError as e:
        logger.error(f"Application error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
