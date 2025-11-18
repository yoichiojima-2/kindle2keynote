"""
High-quality PDF text extraction using PyMuPDF.
"""

import fitz  # PyMuPDF
import pdfplumber
import re
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
                    text_content.append(f"## Page {page_num}\n\n{text}")

        return "\n\n---\n\n".join(text_content)

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

                # Extract regular text with layout preservation for better character mapping
                text = page.extract_text(layout=True, x_tolerance=2, y_tolerance=2)
                if text and text.strip():
                    # Clean CID codes and page headers from main text
                    text = self._remove_cid_codes(text)
                    text = self._remove_page_headers(text)
                    if text.strip():  # Only add if there's content left after cleaning
                        page_content.append(text)

                # Extract tables if enabled
                if extract_tables:
                    tables = page.extract_tables()
                    if tables:
                        valid_tables = []
                        for table in tables:
                            if table and self._is_valid_table(table):
                                valid_tables.append(table)

                        if valid_tables:
                            page_content.append("\n### Tables\n")
                            for table_idx, table in enumerate(valid_tables, 1):
                                page_content.append(f"**Table {table_idx}:**\n")
                                page_content.append(self._format_table_as_markdown(table))
                                page_content.append("")  # Empty line after table

                # Check for images/figures
                images = page.images
                if images:
                    page_content.append(f"\n> 📊 **Note:** {len(images)} image(s)/figure(s) on this page\n")

                if page_content:
                    # Format as markdown with heading
                    text_content.append(f"## Page {page_num}\n\n" + "\n".join(page_content))

        return "\n\n---\n\n".join(text_content)

    def _remove_cid_codes(self, text: str) -> str:
        """Remove CID codes that appear in poorly encoded PDFs."""
        if not text:
            return ""
        # Remove (cid:xxxx) patterns
        text = re.sub(r'\(cid:\d+\)', '', text)
        # Clean up any resulting multiple spaces
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def _remove_page_headers(self, text: str) -> str:
        """Remove common page header/footer artifacts."""
        if not text:
            return ""
        # Remove repeated PART headers like "PPAARRTTII PPAARRTTIIII PPAARRTTIII PPAARRTTIV PPAARRTTV PPAARRTTVI"
        text = re.sub(r'PPAARRT[TI]+(?:\s+PPAARRT[TI]+)*', '', text)
        # Remove leftover roman numerals from PART headers (II, III, IV, V, VI, etc.)
        text = re.sub(r'\b(?:I{1,3}|IV|V|VI{1,3}|IX|X)\s+(?:I{1,3}|IV|V|VI{1,3}|IX|X)\s+(?:I{1,3}|IV|V|VI{1,3}|IX|X)', '', text)
        # Clean up any resulting multiple spaces
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def _is_valid_table(self, table) -> bool:
        """Check if a table is valid and worth extracting."""
        if not table or len(table) < 2:  # Need at least header + 1 data row
            return False

        # Count non-empty cells and calculate statistics
        non_empty_cells = 0
        total_cells = 0
        total_text_length = 0
        non_empty_rows = 0
        cells_per_row = []

        for row in table:
            if row:
                row_has_content = False
                row_non_empty = 0
                for cell in row:
                    total_cells += 1
                    if cell and str(cell).strip():
                        non_empty_cells += 1
                        total_text_length += len(str(cell).strip())
                        row_has_content = True
                        row_non_empty += 1
                if row_has_content:
                    non_empty_rows += 1
                    cells_per_row.append(row_non_empty)

        # Skip if less than 40% of cells have content (increased from 30%)
        if total_cells == 0 or (non_empty_cells / total_cells) < 0.4:
            return False

        # Skip single-column tables (likely page headers/footers)
        if table[0] and len(table[0]) == 1:
            return False

        # Skip tables where first row has single repeated pattern (like PPAARRTTIIII)
        if table[0] and len(set(str(cell).strip() for cell in table[0] if cell)) == 1:
            return False

        # Skip tables with very few rows (need at least 4 rows for meaningful tables)
        if non_empty_rows < 4:
            return False

        # Skip tables where average cell content is too short (fragmented text from diagrams)
        if non_empty_cells > 0:
            avg_cell_length = total_text_length / non_empty_cells
            # If average content per cell is less than 15 characters, likely a diagram
            if avg_cell_length < 15:
                return False

        # Skip tables with very sparse rows (diagrams have many empty cells per row)
        if cells_per_row:
            avg_cells_per_row = sum(cells_per_row) / len(cells_per_row)
            num_columns = len(table[0]) if table[0] else 0
            # If on average less than 40% of columns are filled per row, it's likely a diagram
            if num_columns > 0 and (avg_cells_per_row / num_columns) < 0.4:
                return False

        return True

    def _clean_cell_text(self, cell) -> str:
        """Clean and normalize cell text."""
        if cell is None:
            return ""

        text = str(cell)
        # Remove CID codes
        text = self._remove_cid_codes(text)
        # Replace newlines with spaces
        text = text.replace('\n', ' ')
        # Replace multiple spaces with single space
        text = re.sub(r'\s+', ' ', text)
        # Strip leading/trailing whitespace
        text = text.strip()

        return text

    def _format_table_as_markdown(self, table) -> str:
        """Format extracted table as markdown."""
        if not table or len(table) == 0:
            return ""

        lines = []

        # Clean all cells in the table
        cleaned_table = []
        for row in table:
            if row:
                cleaned_row = [self._clean_cell_text(cell) for cell in row]
                # Skip rows that are all empty
                if any(cell for cell in cleaned_row):
                    cleaned_table.append(cleaned_row)

        if not cleaned_table:
            return ""

        # Process header row
        if cleaned_table[0]:
            header = " | ".join(cell for cell in cleaned_table[0])
            lines.append(f"| {header} |")
            # Add separator
            separator = " | ".join("---" for _ in cleaned_table[0])
            lines.append(f"| {separator} |")

        # Process data rows
        for row in cleaned_table[1:]:
            if row:
                row_text = " | ".join(cell for cell in row)
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
