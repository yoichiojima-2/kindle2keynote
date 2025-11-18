"""
High-quality PDF text extraction using PyMuPDF.
"""

import fitz  # PyMuPDF
import pdfplumber
from pathlib import Path
from typing import Optional


class PDFExtractor:
    """Extract text from PDF files with high accuracy."""

    def __init__(self, pdf_path: str):
        self.pdf_path = Path(pdf_path)
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    def extract_with_pymupdf(self) -> str:
        """
        Extract text using PyMuPDF (primary method).
        Fast and accurate for most digital PDFs.
        """
        text_content = []

        with fitz.open(self.pdf_path) as doc:
            for page_num, page in enumerate(doc, start=1):
                # Extract text while preserving layout
                text = page.get_text("text")

                if text.strip():
                    text_content.append(f"--- Page {page_num} ---\n{text}")

        return "\n\n".join(text_content)

    def extract_with_pdfplumber(self) -> str:
        """
        Extract text using pdfplumber (fallback method).
        Better for complex layouts and tables.
        """
        text_content = []

        with pdfplumber.open(self.pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text()

                if text and text.strip():
                    text_content.append(f"--- Page {page_num} ---\n{text}")

        return "\n\n".join(text_content)

    def extract(self, method: str = "auto") -> str:
        """
        Extract text from PDF using the specified method.

        Args:
            method: 'pymupdf', 'pdfplumber', or 'auto' (default)

        Returns:
            Extracted text content
        """
        if method == "auto":
            # Try PyMuPDF first (faster)
            try:
                text = self.extract_with_pymupdf()
                if text.strip():
                    return text
            except Exception as e:
                print(f"PyMuPDF extraction failed: {e}")

            # Fallback to pdfplumber
            try:
                text = self.extract_with_pdfplumber()
                if text.strip():
                    return text
            except Exception as e:
                print(f"pdfplumber extraction failed: {e}")

            raise ValueError("Failed to extract text with all methods")

        elif method == "pymupdf":
            return self.extract_with_pymupdf()

        elif method == "pdfplumber":
            return self.extract_with_pdfplumber()

        else:
            raise ValueError(f"Unknown extraction method: {method}")

    def save_extracted_text(self, output_path: str, method: str = "auto") -> None:
        """Extract text and save to a file."""
        text = self.extract(method=method)

        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(text, encoding="utf-8")

        print(f"Text extracted and saved to: {output_path}")


def extract_pdf_text(pdf_path: str, output_path: Optional[str] = None) -> str:
    """
    Convenience function to extract text from a PDF.

    Args:
        pdf_path: Path to the PDF file
        output_path: Optional path to save extracted text

    Returns:
        Extracted text content
    """
    extractor = PDFExtractor(pdf_path)
    text = extractor.extract()

    if output_path:
        extractor.save_extracted_text(output_path)

    return text


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python pdf_extractor.py <pdf_file> [output_file]")
        sys.exit(1)

    pdf_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    text = extract_pdf_text(pdf_file, output_file)

    if not output_file:
        print(text)
