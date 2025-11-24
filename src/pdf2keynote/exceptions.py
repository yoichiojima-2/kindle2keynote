"""Custom exceptions for pdf2keynote."""

class PDF2KeynoteError(Exception):
    """Base exception for pdf2keynote."""
    pass

class PDFExtractionError(PDF2KeynoteError):
    """Raised when PDF extraction fails."""
    pass

class ConversionError(PDF2KeynoteError):
    """Raised when Marp conversion fails."""
    pass

class ConfigurationError(PDF2KeynoteError):
    """Raised when configuration is invalid."""
    pass

class ProviderError(PDF2KeynoteError):
    """Raised when LLM provider fails."""
    pass
