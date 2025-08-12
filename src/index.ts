#!/usr/bin/env node

import { program } from 'commander';
import { KindleScraper } from './scraper/KindleScraper';
import { DockerKindleScraper } from './scraper/DockerKindleScraper';
import { TextProcessor } from './processor/TextProcessor';
import { MarkdownGenerator } from './generators/MarkdownGenerator';
import { KeynoteGenerator } from './generators/KeynoteGenerator';
import { mkdirSync } from 'fs';

program
  .name('kindle2keynote')
  .description('Extract text from Kindle Cloud Reader and generate summaries')
  .version('1.0.0');

program
  .command('extract')
  .description('Extract text from a Kindle book')
  .option('-u, --url <url>', 'Kindle book URL')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('-f, --format <format>', 'Output format (markdown|keynote|both)', 'both')
  .action(async (options) => {
    if (!options.url) {
      console.error('❌ Error: Please provide a Kindle book URL with -u or --url');
      process.exit(1);
    }

    console.log('🚀 Starting Kindle2Keynote...');
    console.log(`📚 Book URL: ${options.url}`);
    console.log(`📁 Output directory: ${options.output}`);
    console.log(`📝 Format: ${options.format}`);
    
    try {
      // Ensure output directory exists
      mkdirSync(options.output, { recursive: true });
      
      // Step 1: Extract content from Kindle
      console.log('\n🔍 Step 1: Extracting content from Kindle...');
      // Use Docker scraper if running in Docker environment
      const isDocker = process.env.DOCKER_ENV === 'true' || process.env.DISPLAY === ':99';
      const scraper = isDocker ? new DockerKindleScraper() : new KindleScraper();
      if (isDocker) {
        console.log('🐳 Using Docker-optimized scraper');
      }
      const extractedContent = await scraper.extractBook(options.url, options.output, options.format);
      
      // Step 2: Process and analyze content
      console.log('\n🧠 Step 2: Processing and analyzing content...');
      const processor = new TextProcessor();
      const processedContent = await processor.processContent(extractedContent);
      
      // Step 3: Generate outputs
      console.log('\n📄 Step 3: Generating outputs...');
      const generatedFiles: string[] = [];
      
      if (options.format === 'markdown' || options.format === 'both') {
        const markdownGenerator = new MarkdownGenerator();
        const markdownFile = await markdownGenerator.generate(
          extractedContent,
          processedContent,
          options.output
        );
        generatedFiles.push(markdownFile);
      }
      
      if (options.format === 'keynote' || options.format === 'both') {
        const keynoteGenerator = new KeynoteGenerator();
        const keynoteFile = await keynoteGenerator.generate(
          extractedContent,
          processedContent,
          options.output
        );
        generatedFiles.push(keynoteFile);
      }
      
      // Summary
      console.log('\n✅ Extraction completed successfully!');
      console.log('\n📊 Summary:');
      console.log(`   Title: ${extractedContent.metadata.title}`);
      console.log(`   Author: ${extractedContent.metadata.author}`);
      console.log(`   Chapters: ${extractedContent.chapters.length}`);
      console.log(`   Word Count: ${processedContent.chapters.reduce((sum, ch) => sum + ch.wordCount, 0)}`);
      console.log(`   Key Points: ${processedContent.keyPoints.length}`);
      console.log(`   Main Themes: ${processedContent.themes.length}`);
      
      console.log('\n📁 Generated files:');
      generatedFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
      
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('help')
  .description('Show detailed usage instructions')
  .action(() => {
    console.log(`
📚 Kindle2Keynote - Extract and summarize Kindle books

USAGE:
  npm run dev -- extract -u "KINDLE_URL" [options]

EXAMPLES:
  # Extract with both formats
  npm run dev -- extract -u "https://read.amazon.com/kp/embed?asin=B123456789"
  
  # Generate only Markdown
  npm run dev -- extract -u "URL" -f markdown
  
  # Custom output directory
  npm run dev -- extract -u "URL" -o ./my-output

GETTING KINDLE URL:
  1. Go to read.amazon.com
  2. Open your book
  3. Copy the URL from address bar
  4. Use the full URL starting with https://read.amazon.com/

OUTPUT FORMATS:
  markdown - Structured document with summaries and full text
  keynote  - Presentation outline and slides
  both     - Generate both formats (default)

REQUIREMENTS:
  - Book must be in your Kindle library
  - Intended for books you own or have authored
  - Respects copyright laws and Amazon ToS

For more details, see instructions.md
`);
  });

program.parse();