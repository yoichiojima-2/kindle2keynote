"""
Convert extracted text to Marp presentation format using LLM providers.
"""

import os
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    def generate(self, prompt: str, max_tokens: int = 32000) -> str:
        """Generate text from the prompt."""
        pass


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider."""

    def __init__(self, api_key: Optional[str] = None):
        from anthropic import Anthropic

        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")
        self.client = Anthropic(api_key=self.api_key)

    def generate(self, prompt: str, max_tokens: int = 32000) -> str:
        from anthropic import APIStatusError

        max_retries = 3
        base_delay = 30

        for attempt in range(max_retries):
            try:
                full_response = ""
                with self.client.messages.stream(
                    model="claude-sonnet-4-20250514",
                    max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}]
                ) as stream:
                    for text in stream.text_stream:
                        full_response += text
                return full_response

            except APIStatusError as e:
                if "overloaded" in str(e).lower() and attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"API overloaded, retrying in {delay} seconds... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(delay)
                else:
                    raise


class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider."""

    def __init__(self, api_key: Optional[str] = None):
        from openai import OpenAI

        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not found in environment")
        self.client = OpenAI(api_key=self.api_key)

    def generate(self, prompt: str, max_tokens: int = 32000) -> str:
        # GPT-4o supports max 16384 completion tokens
        openai_max_tokens = min(max_tokens, 16384)
        response = self.client.chat.completions.create(
            model="gpt-4o",
            max_tokens=openai_max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content or ""


class GeminiProvider(LLMProvider):
    """Google Gemini provider."""

    def __init__(self, api_key: Optional[str] = None):
        from google import genai

        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        self.client = genai.Client(api_key=self.api_key)

    def generate(self, prompt: str, max_tokens: int = 32000) -> str:
        from google.genai import types

        response = self.client.models.generate_content(
            model="gemini-3-pro-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=max_tokens
            )
        )
        return response.text or ""


class MarpConverter:
    """Convert text content to Marp presentation slides."""

    def __init__(self, provider: str = "anthropic", api_key: Optional[str] = None):
        """
        Initialize the converter with specified provider.

        Args:
            provider: LLM provider ('anthropic' or 'openai')
            api_key: Optional API key (uses env var if not provided)
        """
        if provider == "anthropic":
            self.llm = AnthropicProvider(api_key)
        elif provider == "openai":
            self.llm = OpenAIProvider(api_key)
        elif provider == "gemini":
            self.llm = GeminiProvider(api_key)
        else:
            raise ValueError(f"Unknown provider: {provider}. Use 'anthropic', 'openai', or 'gemini'")

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
        result = self.llm.generate(prompt)
        return self._clean_response(result)

    def _clean_response(self, content: str) -> str:
        """Clean LLM response by removing code blocks and extra text."""
        import re

        # Remove markdown code blocks if present
        code_block_pattern = r'^```(?:markdown)?\s*\n(.*?)```\s*$'
        match = re.search(code_block_pattern, content, re.DOTALL)
        if match:
            content = match.group(1)

        # Find the Marp frontmatter start and extract from there
        frontmatter_start = content.find('---\nmarp: true')
        if frontmatter_start == -1:
            frontmatter_start = content.find('---\nmarp:true')
        if frontmatter_start > 0:
            content = content[frontmatter_start:]

        # Remove any trailing explanation text after the last slide
        # Look for common patterns that indicate end of presentation
        lines = content.rstrip().split('\n')
        while lines and not lines[-1].strip().startswith('-->') and not lines[-1].strip().startswith('---') and lines[-1].strip() and not lines[-1].strip().startswith('#') and not lines[-1].strip().startswith('-'):
            if 'presentation' in lines[-1].lower() or 'slide' in lines[-1].lower() or 'This ' in lines[-1]:
                lines.pop()
            else:
                break

        return '\n'.join(lines)

    def _build_conversion_prompt(self, text_content: str, style: str, language: str, target_slides: int) -> str:
        """Build the prompt for LLM to convert text to Marp."""
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
5. Include brief section context in slide titles (e.g., "環境分析 | PEST分析") so viewers know which section they're in. Keep titles concise.
6. {style_guide}
7. IMPORTANT: Keep content concise enough to fit on one slide. Avoid overflow - if content is too long, split into multiple slides or use shorter bullet points. Aim for 5-7 bullet points maximum per slide.
7. Use nested bullet points, numbered lists, and tables to pack information efficiently
8. Add slide separators (---) between slides
9. Include a title slide and conclusion slide
10. {language_guide}
11. Target approximately {target_slides} slides total (excluding title/conclusion)
12. {detail_guide}
13. Preserve specific examples, data points, frameworks, and explanations from source
14. Each slide should be able to stand alone as reference material
15. **Add detailed speaker notes**: After each slide's content, add HTML comments with comprehensive speaker notes using this format:
    ```
    <!--
    Speaker notes here - detailed context, talking points, examples to mention verbally
    -->
    ```
    Speaker notes should be DETAILED (at least 5-8 sentences per slide) and include:
    - Detailed explanation of the slide content and why it matters
    - Specific talking points with concrete examples or anecdotes
    - Background context that couldn't fit on the slide
    - Data points, statistics, or evidence to support claims
    - Potential audience questions and how to answer them
    - Smooth transitions to the next slide
    - Tips for emphasis or delivery (what to stress, where to pause)

Marp frontmatter should include:
```
---
marp: true
theme: default
paginate: true
style: |
  section {{
    font-size: 20px;
  }}
  h1 {{
    font-size: 40px;
    color: #191970;
  }}
  h2 {{
    font-size: 32px;
    color: #191970;
  }}
  h3 {{
    font-size: 24px;
    color: #191970;
  }}
  strong {{
    color: #191970;
  }}
---
```

Source text:
{text_content}

IMPORTANT: Output ONLY the raw Marp markdown content. Do NOT wrap it in code blocks (no ```markdown or ```). Do NOT include any explanation or commentary before or after the Marp content. Start directly with the --- frontmatter."""

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
    target_slides: int = 20,
    provider: str = "anthropic"
) -> str:
    """
    Convenience function to convert text to Marp format.

    Args:
        text_content: Text to convert
        output_path: Optional path to save the Marp file
        style: Presentation style
        language: Output language ('en' or 'ja')
        target_slides: Target number of slides (default: 20)
        provider: LLM provider ('anthropic' or 'openai')

    Returns:
        Marp-formatted markdown
    """
    converter = MarpConverter(provider=provider)
    marp_content = converter.convert_to_marp(text_content, style=style, language=language, target_slides=target_slides)

    if output_path:
        converter.save_marp_file(marp_content, output_path)

    return marp_content


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python marp_converter.py <text_file> [output_file] [style] [language] [target_slides] [provider]")
        sys.exit(1)

    text_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    style = sys.argv[3] if len(sys.argv) > 3 else "default"
    language = sys.argv[4] if len(sys.argv) > 4 else "en"
    target_slides = int(sys.argv[5]) if len(sys.argv) > 5 else 20
    provider = sys.argv[6] if len(sys.argv) > 6 else "anthropic"

    text_content = Path(text_file).read_text(encoding="utf-8")
    marp_content = convert_text_to_marp(text_content, output_file, style, language, target_slides, provider)

    if not output_file:
        print(marp_content)
