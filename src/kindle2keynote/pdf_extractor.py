"""
High-quality PDF text extraction using PyMuPDF.
"""

import fitz  # PyMuPDF
import pdfplumber
from pathlib import Path
from typing import Optional, Tuple


class PDFExtractor:
    """Extract text from PDF files with high accuracy."""

    def __init__(self, pdf_path: str):
        self.pdf_path = Path(pdf_path)
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    def extract_with_pymupdf(self, page_range: Optional[Tuple[int, int]] = None) -> str:
        """
        Extract text using PyMuPDF (primary method).
        Fast and accurate for most digital PDFs.

        Args:
            page_range: Optional tuple of (start_page, end_page) (1-indexed, inclusive)
        """
        text_content = []

        with fitz.open(self.pdf_path) as doc:
            total_pages = len(doc)

            # Determine page range
            if page_range:
                start_page, end_page = page_range
                # Convert to 0-indexed and validate
                start_idx = max(0, start_page - 1)
                end_idx = min(total_pages, end_page)
            else:
                start_idx = 0
                end_idx = total_pages

            for page_idx in range(start_idx, end_idx):
                page = doc[page_idx]
                page_num = page_idx + 1

                # Extract text while preserving layout
                text = page.get_text("text")

                if text.strip():
                    text_content.append(f"--- Page {page_num} ---\n{text}")

        return "\n\n".join(text_content)

    def extract_with_pdfplumber(self, page_range: Optional[Tuple[int, int]] = None, extract_tables: bool = True) -> str:
        """
        Extract text using pdfplumber (fallback method).
        Better for complex layouts and tables.

        Args:
            page_range: Optional tuple of (start_page, end_page) (1-indexed, inclusive)
            extract_tables: Whether to extract and format tables separately (default: True)
        """
        text_content = []

        with pdfplumber.open(self.pdf_path) as pdf:
            total_pages = len(pdf.pages)

            # Determine page range
            if page_range:
                start_page, end_page = page_range
                # Convert to 0-indexed and validate
                start_idx = max(0, start_page - 1)
                end_idx = min(total_pages, end_page)
            else:
                start_idx = 0
                end_idx = total_pages

            for page_idx in range(start_idx, end_idx):
                page = pdf.pages[page_idx]
                page_num = page_idx + 1

                page_content = []

                # Extract regular text
                text = page.extract_text()
                if text and text.strip():
                    page_content.append(text)

                # Extract tables if enabled
                if extract_tables:
                    tables = page.extract_tables()
                    if tables:
                        page_content.append("\n[TABLES DETECTED ON THIS PAGE]")
                        for table_idx, table in enumerate(tables, 1):
                            if table:
                                page_content.append(f"\n[Table {table_idx}]")
                                page_content.append(self._format_table_as_markdown(table))

                # Check for images/figures
                images = page.images
                if images:
                    page_content.append(f"\n[IMAGES/FIGURES DETECTED: {len(images)} image(s) on this page]")

                if page_content:
                    text_content.append(f"--- Page {page_num} ---\n" + "\n".join(page_content))

        return "\n\n".join(text_content)

    def _format_table_as_markdown(self, table) -> str:
        """Format extracted table as markdown."""
        if not table or len(table) == 0:
            return ""

        lines = []

        # Process header row
        if table[0]:
            header = " | ".join(str(cell) if cell else "" for cell in table[0])
            lines.append(f"| {header} |")
            # Add separator
            separator = " | ".join("---" for _ in table[0])
            lines.append(f"| {separator} |")

        # Process data rows
        for row in table[1:]:
            if row:
                row_text = " | ".join(str(cell) if cell else "" for cell in row)
                lines.append(f"| {row_text} |")

        return "\n".join(lines)

    def extract(self, method: str = "auto", page_range: Optional[Tuple[int, int]] = None) -> str:
        """
        Extract text from PDF using the specified method.

        Args:
            method: 'pymupdf', 'pdfplumber', or 'auto' (default)
            page_range: Optional tuple of (start_page, end_page) (1-indexed, inclusive)

        Returns:
            Extracted text content
        """
        if method == "auto":
            # Try PyMuPDF first (faster)
            try:
                text = self.extract_with_pymupdf(page_range=page_range)
                if text.strip():
                    return text
            except Exception as e:
                print(f"PyMuPDF extraction failed: {e}")

            # Fallback to pdfplumber
            try:
                text = self.extract_with_pdfplumber(page_range=page_range)
                if text.strip():
                    return text
            except Exception as e:
                print(f"pdfplumber extraction failed: {e}")

            raise ValueError("Failed to extract text with all methods")

        elif method == "pymupdf":
            return self.extract_with_pymupdf(page_range=page_range)

        elif method == "pdfplumber":
            return self.extract_with_pdfplumber(page_range=page_range)

        else:
            raise ValueError(f"Unknown extraction method: {method}")

    def save_extracted_text(self, output_path: str, method: str = "auto", page_range: Optional[Tuple[int, int]] = None) -> None:
        """Extract text and save to a file."""
        text = self.extract(method=method, page_range=page_range)

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
