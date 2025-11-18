"""kindle2keynote - Convert PDF ebooks to Marp presentations."""

from .pdf_extractor import PDFExtractor, extract_pdf_text
from .marp_converter import MarpConverter, convert_text_to_marp

__version__ = "0.1.0"
__all__ = [
    "PDFExtractor",
    "extract_pdf_text",
    "MarpConverter",
    "convert_text_to_marp",
]
