#!/usr/bin/env node

import { program } from 'commander';
import { KindleScraper } from './scraper/KindleScraper';
import { TextProcessor } from './processor/TextProcessor';
import { MarkdownGenerator } from './generators/MarkdownGenerator';
import { KeynoteGenerator } from './generators/KeynoteGenerator';
import { mkdirSync } from 'fs';

program
  .name('kindle2keynote')
  .description('Extract text from Kindle Cloud Reader')
  .version('1.0.0');

program
  .command('extract')
  .description('Extract text from a Kindle book')
  .requiredOption('-u, --url <url>', 'Kindle book URL')
  .option('-o, --output <path>', 'Output directory', '/app/output')
  .option('-f, --format <format>', 'Output format (markdown|keynote|both)', 'both')
  .action(async (options) => {

    console.log('🚀 Starting Kindle2Keynote...');
    console.log(`📚 Book URL: ${options.url}`);
    console.log(`📁 Output directory: ${options.output}`);
    console.log(`📝 Format: ${options.format}`);
    
    try {
      // Ensure output directory exists
      mkdirSync(options.output, { recursive: true });
      
      // Step 1: Extract content from Kindle
      console.log('\n🔍 Step 1: Extracting content from Kindle...');
      const scraper = new KindleScraper();
      const extractedContent = await scraper.extractBook(options.url);
      
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
  .description('Show usage instructions')
  .action(() => {
    console.log(`
📚 Kindle2Keynote

USAGE:
  docker compose run app npm run extract -- -u "URL" [options]

OPTIONS:
  -u, --url <url>      Kindle book URL (required)
  -f, --format <type>  Output format: markdown|keynote|both (default: both)
  -o, --output <path>  Output directory (default: /app/output)

EXAMPLE:
  docker compose run app npm run extract -- -u "https://read.amazon.com/?asin=B123456789"
`);
  });

program.parse();