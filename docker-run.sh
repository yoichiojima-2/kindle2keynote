#!/bin/bash

# Build and run the Docker container for Kindle scraping

echo "🐳 Building Docker container..."
docker-compose build

echo "🚀 Starting Kindle scraper in Docker..."
echo "Note: First run will require Amazon login"
echo ""

# Check if we have a book URL argument
if [ -z "$1" ]; then
    echo "Usage: ./docker-run.sh <kindle-book-url>"
    echo "Example: ./docker-run.sh 'https://read.amazon.com/kp/embed?asin=B08XYZ123'"
    exit 1
fi

# Run the container with the book URL
docker-compose run --rm kindle-scraper npm run dev -- extract -u "$1" -f both

echo "✅ Done! Check the output/ directory for results"