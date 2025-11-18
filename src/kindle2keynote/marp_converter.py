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

    def convert_to_marp(self, text_content: str, style: str = "default", language: str = "en", target_slides: int = 20) -> str:
        """
        Convert text content to Marp markdown format.

        Args:
            text_content: Extracted text from PDF
            style: Presentation style ('default', 'minimal', 'academic')
            language: Output language ('en' for English, 'ja' for Japanese)
            target_slides: Target number of slides (default: 20, controls detail level)

        Returns:
            Marp-formatted markdown
        """
        prompt = self._build_conversion_prompt(text_content, style, language, target_slides)

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

    def _build_conversion_prompt(self, text_content: str, style: str, language: str, target_slides: int) -> str:
        """Build the prompt for Claude to convert text to Marp."""
        style_instructions = {
            "default": "Use a clean, professional style with good visual hierarchy.",
            "minimal": "Use minimal design with focus on content. Avoid decorations.",
            "academic": "Use academic presentation style with clear structure and citations."
        }

        language_instructions = {
            "en": "Generate the presentation in English.",
            "ja": """Generate the presentation in Japanese. Follow Japanese business presentation style:
- Create information-dense slides (not minimal talking points)
- Include comprehensive details, examples, and explanations on slides
- Preserve all important information from the source
- Think of slides as a condensed written document, not just visual aids
- Use detailed bullet points with sub-points and explanations
- Include concrete examples, data, and specific details on slides
- Maintain academic/business document quality"""
        }

        # Determine detail level based on target slides
        if target_slides <= 15:
            detail_guide = "Cover main concepts comprehensively but fewer topics. Pack significant information into each slide."
        elif target_slides <= 30:
            detail_guide = "Cover most important content with substantial detail. Include explanations, examples, and context. Each slide should be information-rich."
        else:
            detail_guide = "Create a thorough, comprehensive presentation covering nearly all content. Include detailed explanations, multiple examples, specific data, and full context for each point. Preserve as much information from the source as possible."

        style_guide = style_instructions.get(style, style_instructions["default"])
        language_guide = language_instructions.get(language, language_instructions["en"])

        return f"""Convert the following text extracted from a PDF ebook into a Marp presentation.

Instructions:
1. Create comprehensive, information-dense slides that preserve important content
2. Add proper Marp frontmatter with theme configuration
3. Break content into logical sections with clear headings
4. Use detailed bullet points with sub-points and explanations
5. {style_guide}
6. Include substantial information per slide - aim for detailed coverage not minimal points
7. Use nested bullet points, numbered lists, and tables to pack information efficiently
8. Add slide separators (---) between slides
9. Include a title slide and conclusion slide
10. {language_guide}
11. Target approximately {target_slides} slides total (excluding title/conclusion)
12. {detail_guide}
13. Preserve specific examples, data points, frameworks, and explanations from source
14. Each slide should be able to stand alone as reference material

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

Please generate the complete Marp presentation with comprehensive, detailed content:"""

    def save_marp_file(self, marp_content: str, output_path: str) -> None:
        """Save Marp content to a markdown file."""
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(marp_content, encoding="utf-8")

        print(f"Marp presentation saved to: {output_path}")


def convert_text_to_marp(
    text_content: str,
    output_path: Optional[str] = None,
    style: str = "default",
    language: str = "en",
    target_slides: int = 20
) -> str:
    """
    Convenience function to convert text to Marp format.

    Args:
        text_content: Text to convert
        output_path: Optional path to save the Marp file
        style: Presentation style
        language: Output language ('en' or 'ja')
        target_slides: Target number of slides (default: 20)

    Returns:
        Marp-formatted markdown
    """
    converter = MarpConverter()
    marp_content = converter.convert_to_marp(text_content, style=style, language=language, target_slides=target_slides)

    if output_path:
        converter.save_marp_file(marp_content, output_path)

    return marp_content


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python marp_converter.py <text_file> [output_file] [style] [language] [target_slides]")
        sys.exit(1)

    text_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    style = sys.argv[3] if len(sys.argv) > 3 else "default"
    language = sys.argv[4] if len(sys.argv) > 4 else "en"
    target_slides = int(sys.argv[5]) if len(sys.argv) > 5 else 20

    text_content = Path(text_file).read_text(encoding="utf-8")
    marp_content = convert_text_to_marp(text_content, output_file, style, language, target_slides)

    if not output_file:
        print(marp_content)
