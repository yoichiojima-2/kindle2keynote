"""
Convert extracted text to Marp presentation format using Claude.
"""

import os
from anthropic import Anthropic
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class MarpConverter:
    """Convert text content to Marp presentation slides."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")

        self.client = Anthropic(api_key=self.api_key)

    def convert_to_marp(self, text_content: str, style: str = "default") -> str:
        """
        Convert text content to Marp markdown format.

        Args:
            text_content: Extracted text from PDF
            style: Presentation style ('default', 'minimal', 'academic')

        Returns:
            Marp-formatted markdown
        """
        prompt = self._build_conversion_prompt(text_content, style)

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=16000,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return message.content[0].text

    def _build_conversion_prompt(self, text_content: str, style: str) -> str:
        """Build the prompt for Claude to convert text to Marp."""
        style_instructions = {
            "default": "Use a clean, professional style with good visual hierarchy.",
            "minimal": "Use minimal design with focus on content. Avoid decorations.",
            "academic": "Use academic presentation style with clear structure and citations."
        }

        style_guide = style_instructions.get(style, style_instructions["default"])

        return f"""Convert the following text extracted from a PDF ebook into a Marp presentation.

Instructions:
1. Create engaging, informative slides from the content
2. Add proper Marp frontmatter with theme configuration
3. Break content into logical sections with clear headings
4. Use bullet points, lists, and formatting effectively
5. {style_guide}
6. Keep slides concise - aim for 5-7 points per slide maximum
7. Add slide separators (---) between slides
8. Include a title slide and conclusion slide

Marp frontmatter should include:
```
---
marp: true
theme: default
paginate: true
---
```

Source text:
{text_content}

Please generate the complete Marp presentation:"""

    def save_marp_file(self, marp_content: str, output_path: str) -> None:
        """Save Marp content to a markdown file."""
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(marp_content, encoding="utf-8")

        print(f"Marp presentation saved to: {output_path}")


def convert_text_to_marp(
    text_content: str,
    output_path: Optional[str] = None,
    style: str = "default"
) -> str:
    """
    Convenience function to convert text to Marp format.

    Args:
        text_content: Text to convert
        output_path: Optional path to save the Marp file
        style: Presentation style

    Returns:
        Marp-formatted markdown
    """
    converter = MarpConverter()
    marp_content = converter.convert_to_marp(text_content, style=style)

    if output_path:
        converter.save_marp_file(marp_content, output_path)

    return marp_content


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python marp_converter.py <text_file> [output_file] [style]")
        sys.exit(1)

    text_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    style = sys.argv[3] if len(sys.argv) > 3 else "default"

    text_content = Path(text_file).read_text(encoding="utf-8")
    marp_content = convert_text_to_marp(text_content, output_file, style)

    if not output_file:
        print(marp_content)
