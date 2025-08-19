#!/bin/bash

# Simple Docker runner for Kindle2Keynote

# Default values
URL=""
FORMAT="both"
OUTPUT="./output"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -u|--url)
      URL="$2"
      shift 2
      ;;
    -f|--format)
      FORMAT="$2"
      shift 2
      ;;
    -o|--output)
      OUTPUT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./run.sh -u URL [-f format] [-o output]"
      exit 1
      ;;
  esac
done

if [ -z "$URL" ]; then
  echo "Error: URL is required"
  echo "Usage: ./run.sh -u URL [-f format] [-o output]"
  exit 1
fi

# Build if needed
docker compose build

# Run extraction
docker compose run --rm app npm run extract -- -u "$URL" -f "$FORMAT" -o "$OUTPUT"