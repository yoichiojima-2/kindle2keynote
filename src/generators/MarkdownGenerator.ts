import { writeFileSync } from 'fs';
import { join } from 'path';
import { ExtractedContent } from '../scraper/KindleScraper';
import { ProcessedContent } from '../processor/TextProcessor';

export class MarkdownGenerator {
  async generate(
    extractedContent: ExtractedContent,
    processedContent: ProcessedContent,
    outputPath: string
  ): Promise<string> {
    console.log('📝 Generating Markdown output...');
    
    const markdown = this.createMarkdown(extractedContent, processedContent);
    const filename = this.sanitizeFilename(extractedContent.metadata.title) + '.md';
    const fullPath = join(outputPath, filename);
    
    writeFileSync(fullPath, markdown, 'utf8');
    
    console.log(`✅ Markdown generated: ${fullPath}`);
    return fullPath;
  }

  private createMarkdown(
    extractedContent: ExtractedContent,
    processedContent: ProcessedContent
  ): string {
    const { metadata } = extractedContent;
    const { summary, chapters, keyPoints, themes } = processedContent;
    
    let markdown = '';
    
    // Title and metadata
    markdown += `# ${metadata.title}\n\n`;
    markdown += `**Author:** ${metadata.author}\n\n`;
    
    if (metadata.asin) {
      markdown += `**ASIN:** ${metadata.asin}\n\n`;
    }
    
    markdown += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
    markdown += `---\n\n`;
    
    // Table of Contents
    markdown += `## Table of Contents\n\n`;
    markdown += `1. [Executive Summary](#executive-summary)\n`;
    markdown += `2. [Key Points](#key-points)\n`;
    markdown += `3. [Main Themes](#main-themes)\n`;
    markdown += `4. [Detailed Summary](#detailed-summary)\n`;
    markdown += `5. [Chapter Summaries](#chapter-summaries)\n`;
    markdown += `6. [Full Content](#full-content)\n\n`;
    
    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `${summary.executive}\n\n`;
    
    // Key Points
    markdown += `## Key Points\n\n`;
    keyPoints.forEach((point, index) => {
      markdown += `${index + 1}. ${point}\n`;
    });
    markdown += `\n`;
    
    // Main Themes
    markdown += `## Main Themes\n\n`;
    themes.forEach(theme => {
      markdown += `- **${theme}**\n`;
    });
    markdown += `\n`;
    
    // Detailed Summary
    markdown += `## Detailed Summary\n\n`;
    markdown += `${summary.detailed}\n\n`;
    
    // Brief Summary
    markdown += `### Brief Summary\n\n`;
    markdown += `${summary.brief}\n\n`;
    
    // Chapter Summaries
    markdown += `## Chapter Summaries\n\n`;
    chapters.forEach((chapter, index) => {
      markdown += `### ${chapter.title}\n\n`;
      markdown += `**Word Count:** ${chapter.wordCount}\n\n`;
      
      if (chapter.mainTopics.length > 0) {
        markdown += `**Main Topics:** ${chapter.mainTopics.join(', ')}\n\n`;
      }
      
      markdown += `**Summary:** ${chapter.summary}\n\n`;
      
      if (chapter.keyPoints.length > 0) {
        markdown += `**Key Points:**\n`;
        chapter.keyPoints.forEach(point => {
          markdown += `- ${point}\n`;
        });
        markdown += `\n`;
      }
      
      markdown += `---\n\n`;
    });
    
    // Full Content  
    markdown += `## Full Content\n\n`;
    extractedContent.chapters.forEach((chapter, index) => {
      if (extractedContent.chapters.length > 1) {
        markdown += `### ${chapter.title}\n\n`;
      }
      
      // Split content into paragraphs for better readability
      const paragraphs = chapter.content.split(/\n\s*\n/);
      paragraphs.forEach((paragraph: string) => {
        if (paragraph.trim()) {
          markdown += `${paragraph.trim()}\n\n`;
        }
      });
      
      if (extractedContent.chapters.length > 1 && index < extractedContent.chapters.length - 1) {
        markdown += `---\n\n`;
      }
    });
    
    return markdown;
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100); // Limit length
  }
}