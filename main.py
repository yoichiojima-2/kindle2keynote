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
        default="auto",
        help="PDF extraction method (default: auto)"
    )
    parser.add_argument(
        "--save-text",
        help="Optional path to save extracted text"
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
        # Step 1: Extract text from PDF
        print(f"Extracting text from PDF: {args.input_pdf}")
        extractor = PDFExtractor(args.input_pdf)
        text_content = extractor.extract(method=args.extraction_method)

        if not text_content.strip():
            print("Error: No text could be extracted from the PDF", file=sys.stderr)
            sys.exit(1)

        print(f"Successfully extracted {len(text_content)} characters")

        # Optionally save extracted text
        if args.save_text:
            Path(args.save_text).write_text(text_content, encoding="utf-8")
            print(f"Extracted text saved to: {args.save_text}")

        # Step 2: Convert to Marp
        print(f"Converting to Marp presentation (style: {args.style})...")
        converter = MarpConverter()
        marp_content = converter.convert_to_marp(text_content, style=args.style)

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
