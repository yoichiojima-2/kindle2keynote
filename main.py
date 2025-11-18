#!/usr/bin/env python3
"""
kindle2keynote - Convert PDF ebooks to Marp presentations

Usage:
    python main.py input.pdf output.md [--style default|minimal|academic]
"""

import argparse
import sys
from pathlib import Path
from kindle2keynote.pdf_extractor import PDFExtractor
from kindle2keynote.marp_converter import MarpConverter


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
        default="default",
        help="Presentation style (default: default)"
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
        default="en",
        help="Output language for Marp slides (en: English, ja: Japanese, default: en)"
    )

    args = parser.parse_args()

    # Validate input file
    input_path = Path(args.input_pdf)
    if not input_path.exists():
        print(f"Error: Input file not found: {args.input_pdf}", file=sys.stderr)
        sys.exit(1)

    if input_path.suffix.lower() != ".pdf":
        print(f"Error: Input file must be a PDF: {args.input_pdf}", file=sys.stderr)
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
                print(f"Extracting pages {start_page}-{end_page}")
            except ValueError as e:
                print(f"Error: Invalid page range format: {e}", file=sys.stderr)
                sys.exit(1)

        # Step 1: Extract text from PDF
        print(f"Extracting text from PDF: {args.input_pdf}")
        extractor = PDFExtractor(args.input_pdf)
        text_content = extractor.extract(method=args.extraction_method, page_range=page_range)

        if not text_content.strip():
            print("Error: No text could be extracted from the PDF", file=sys.stderr)
            sys.exit(1)

        print(f"Successfully extracted {len(text_content)} characters")

        # Optionally save extracted text
        if args.save_text:
            Path(args.save_text).write_text(text_content, encoding="utf-8")
            print(f"Extracted text saved to: {args.save_text}")

        # Step 2: Convert to Marp
        print(f"Converting to Marp presentation (style: {args.style}, language: {args.language})...")
        converter = MarpConverter()
        marp_content = converter.convert_to_marp(text_content, style=args.style, language=args.language)

        # Step 3: Save output
        output_path = Path(args.output_marp)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(marp_content, encoding="utf-8")

        print(f"Marp presentation saved to: {args.output_marp}")
        print("\nConversion completed successfully!")
        print(f"\nTo view the presentation, use Marp CLI or VS Code with Marp extension:")
        print(f"  marp {args.output_marp}")

    except Exception as e:
        print(f"Error during conversion: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
