# Kindle2Keynote

Extract text from Kindle Cloud Reader and generate summaries in Markdown and Keynote formats.

## Features

- 🌐 Extracts text from Kindle Cloud Reader in browser
- 🧠 AI-powered content analysis and summarization
- 📝 Generates structured Markdown documents
- 🎯 Creates Keynote presentation outlines
- 📊 Identifies key points, themes, and topics

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Extract and generate both Markdown and Keynote formats
npm run dev -- extract -u "https://read.amazon.com/kp/embed?asin=YOUR_BOOK_ASIN"

# Generate only Markdown
npm run dev -- extract -u "https://read.amazon.com/kp/embed?asin=YOUR_BOOK_ASIN" -f markdown

# Generate only Keynote
npm run dev -- extract -u "https://read.amazon.com/kp/embed?asin=YOUR_BOOK_ASIN" -f keynote

# Specify output directory
npm run dev -- extract -u "URL" -o ./my-output -f both
```

## Important Notes

⚠️ **Legal Disclaimer**: This tool is intended for use with books you own or have authored. Please respect copyright laws and Amazon's Terms of Service.

### Browser Setup

The first time you run the tool, it may prompt for Amazon login. The browser session will be saved for future use.

## Output Formats

### Markdown (.md)
- Structured document with table of contents
- Executive summary and key points
- Chapter-by-chapter analysis
- Full extracted text

### Keynote (.key/.pptx/.txt)
- Presentation-ready slides
- Key points and themes
- Chapter summaries
- Fallback text outline if conversion tools unavailable

## Requirements

- Node.js 18+
- macOS (for Keynote generation)
- Optional: `pandoc` or `md2keynote` for enhanced Keynote conversion

## Project Structure

```
src/
├── scraper/        # Browser automation and text extraction
├── processor/      # Content analysis and summarization
├── generators/     # Output format generators
├── cli/           # Command-line interface
└── utils/         # Shared utilities

config/            # Configuration files
templates/         # Keynote templates
output/           # Generated files
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run built version
npm start
```
