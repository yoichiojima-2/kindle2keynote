"""Tests for PDF extraction functionality."""

import pytest
from pathlib import Path
from kindle2keynote.pdf_extractor import PDFExtractor, extract_pdf_text


class TestPDFExtractor:
    """Test cases for PDFExtractor class."""

    @pytest.fixture
    def test_pdf_path(self):
        """Fixture providing the test PDF path."""
        return "assets/books/the-complete-book-of-product-management.pdf"

    @pytest.fixture
    def extractor(self, test_pdf_path):
        """Fixture providing a PDFExtractor instance."""
        if not Path(test_pdf_path).exists():
            pytest.skip(f"Test PDF not found: {test_pdf_path}")
        return PDFExtractor(test_pdf_path)

    def test_file_not_found(self):
        """Test that FileNotFoundError is raised for non-existent PDF."""
        with pytest.raises(FileNotFoundError):
            PDFExtractor("nonexistent.pdf")

    def test_extract_with_pymupdf(self, extractor):
        """Test basic PyMuPDF extraction."""
        text = extractor.extract_with_pymupdf()
        assert text, "Extracted text should not be empty"
        assert isinstance(text, str)
        assert "Page" in text

    def test_extract_with_pdfplumber(self, extractor):
        """Test basic pdfplumber extraction."""
        text = extractor.extract_with_pdfplumber()
        assert text, "Extracted text should not be empty"
        assert isinstance(text, str)
        assert "Page" in text

    def test_extract_page_range(self, extractor):
        """Test extraction with specific page range."""
        # Extract pages 66-100
        text = extractor.extract_with_pymupdf(page_range=(66, 100))

        assert text, "Extracted text should not be empty"
        assert "--- Page 66 ---" in text
        assert "--- Page 100 ---" in text

        # Verify page 65 and 101 are not included
        assert "--- Page 65 ---" not in text
        assert "--- Page 101 ---" not in text

    def test_page_range_validation(self, extractor):
        """Test page range boundary conditions."""
        # Extract with range beyond document length - should extract to end
        text = extractor.extract_with_pymupdf(page_range=(1, 99999))
        assert text, "Should extract available pages"

        # Extract single page
        text = extractor.extract_with_pymupdf(page_range=(66, 66))
        assert "--- Page 66 ---" in text
        assert "--- Page 67 ---" not in text

    def test_extract_auto_method(self, extractor):
        """Test automatic method selection."""
        text = extractor.extract(method="auto")
        assert text, "Auto extraction should succeed"
        assert isinstance(text, str)

    def test_extract_invalid_method(self, extractor):
        """Test error handling for invalid method."""
        with pytest.raises(ValueError, match="Unknown extraction method"):
            extractor.extract(method="invalid_method")

    def test_convenience_function(self, test_pdf_path):
        """Test the convenience function extract_pdf_text."""
        if not Path(test_pdf_path).exists():
            pytest.skip(f"Test PDF not found: {test_pdf_path}")

        text = extract_pdf_text(test_pdf_path)
        assert text, "Convenience function should extract text"
        assert isinstance(text, str)

    def test_save_extracted_text(self, extractor, tmp_path):
        """Test saving extracted text to file."""
        output_path = tmp_path / "test_output.txt"

        extractor.save_extracted_text(
            str(output_path),
            page_range=(66, 70)
        )

        assert output_path.exists()
        content = output_path.read_text(encoding="utf-8")
        assert content, "Saved file should not be empty"
        assert "Page 66" in content
