"""Tests for Marp conversion functionality."""

import pytest
import os
from pathlib import Path
from pdf2keynote.marp_converter import MarpConverter, convert_text_to_marp
from pdf2keynote.exceptions import ProviderError
from pdf2keynote.config import settings


class TestMarpConverter:
    """Test cases for MarpConverter class."""

    @pytest.fixture
    def sample_text(self):
        """Fixture providing sample text for conversion."""
        return """
--- Page 1 ---
Chapter 1: Introduction
This is a test chapter about product management.

Key points:
- Point one
- Point two
- Point three

--- Page 2 ---
Chapter 2: Strategy
Strategic planning is important.
"""

    @pytest.fixture
    def converter(self):
        """Fixture providing a MarpConverter instance."""
        # Check for API key
        api_key = settings.anthropic_api_key
        if not api_key:
            pytest.skip("ANTHROPIC_API_KEY not set")
        return MarpConverter(api_key=api_key)

    def test_api_key_required(self):
        """Test that API key is required."""
        # Temporarily unset the env var
        original = settings.anthropic_api_key
        settings.anthropic_api_key = None
        try:
            with pytest.raises(ProviderError, match="ANTHROPIC_API_KEY"):
                MarpConverter()
        finally:
            settings.anthropic_api_key = original

    @pytest.mark.skipif(
        not settings.anthropic_api_key,
        reason="ANTHROPIC_API_KEY not set"
    )
    def test_convert_to_marp(self, converter, sample_text):
        """Test basic Marp conversion."""
        result = converter.convert_to_marp(sample_text, style="minimal")

        assert result, "Conversion should produce output"
        assert isinstance(result, str)
        # Check for Marp frontmatter
        assert "marp: true" in result
        assert "---" in result

    @pytest.mark.skipif(
        not settings.anthropic_api_key,
        reason="ANTHROPIC_API_KEY not set"
    )
    def test_different_styles(self, converter, sample_text):
        """Test conversion with different styles."""
        for style in ["default", "minimal", "academic"]:
            result = converter.convert_to_marp(sample_text, style=style)
            assert result, f"Conversion with {style} style should work"
            assert "marp: true" in result

    def test_save_marp_file(self, converter, sample_text, tmp_path):
        """Test saving Marp content to file."""
        if not settings.anthropic_api_key:
            pytest.skip("ANTHROPIC_API_KEY not set")

        output_path = tmp_path / "test_output.md"
        marp_content = converter.convert_to_marp(sample_text, style="minimal")
        converter.save_marp_file(marp_content, str(output_path))

        assert output_path.exists()
        content = output_path.read_text(encoding="utf-8")
        assert content == marp_content

    @pytest.mark.skipif(
        not settings.anthropic_api_key,
        reason="ANTHROPIC_API_KEY not set"
    )
    def test_convenience_function(self, sample_text):
        """Test the convenience function convert_text_to_marp."""
        result = convert_text_to_marp(sample_text, style="minimal")
        assert result, "Convenience function should produce output"
        assert "marp: true" in result
