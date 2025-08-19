# Kindle2Keynote

Extract and process text from Kindle Cloud Reader books.

## Prerequisites

- Docker and Docker Compose
- A book in your Kindle library

## Usage

### Quick Start

```bash
# Build the Docker image
make build

# Extract a book
./run.sh -u "https://read.amazon.com/?asin=YOUR_BOOK_ID"
```

### Options

- `-u, --url <url>` - Kindle book URL (required)
- `-f, --format <type>` - Output format: `markdown`, `keynote`, or `both` (default: both)
- `-o, --output <path>` - Output directory (default: ./output)

### Examples

```bash
# Extract with both formats
./run.sh -u "https://read.amazon.com/?asin=B123456789"

# Generate only Markdown
./run.sh -u "https://read.amazon.com/?asin=B123456789" -f markdown

# Custom output directory
./run.sh -u "https://read.amazon.com/?asin=B123456789" -o ./my-output
```

### Using Make commands

```bash
# Build Docker image
make build

# Run extraction with custom arguments
make extract ARGS='-u "URL" -f markdown'

# Open shell in container
make shell

# Show help
make help
```

## Output

The tool generates:
- **Markdown**: Structured document with chapter summaries and full text
- **Keynote**: Presentation outline and slides

Files are saved to the `output/` directory.

## Notes

- First run will prompt for Amazon login
- Login session is saved for subsequent runs
- Supports both amazon.com and amazon.co.jp

