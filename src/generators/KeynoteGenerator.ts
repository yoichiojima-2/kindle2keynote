import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ExtractedContent } from '../scraper/KindleScraper';
import { ProcessedContent } from '../processor/TextProcessor';

const execAsync = promisify(exec);

export class KeynoteGenerator {
  private templatesDir: string;

  constructor(templatesDir: string = join(__dirname, '../../templates')) {
    this.templatesDir = templatesDir;
  }

  async generate(
    extractedContent: ExtractedContent,
    processedContent: ProcessedContent,
    outputPath: string
  ): Promise<string> {
    console.log('🎯 Generating Keynote presentation...');
    
    try {
      // First, create a markdown file optimized for presentation
      const presentationMarkdown = this.createPresentationMarkdown(extractedContent, processedContent);
      const mdFilename = this.sanitizeFilename(extractedContent.metadata.title) + '_presentation.md';
      const mdPath = join(outputPath, mdFilename);
      
      writeFileSync(mdPath, presentationMarkdown, 'utf8');
      console.log(`📄 Created presentation markdown: ${mdPath}`);
      
      // Try to convert to Keynote using available tools
      const keynoteFile = await this.convertToKeynote(mdPath, outputPath);
      
      return keynoteFile;
      
    } catch (error) {
      console.error('❌ Error generating Keynote:', error);
      
      // Fallback: create a simple text outline that can be imported into Keynote
      const outlineFile = await this.createKeynoteOutline(extractedContent, processedContent, outputPath);
      console.log('📋 Created Keynote outline file as fallback');
      
      return outlineFile;
    }
  }

  private async convertToKeynote(markdownPath: string, outputPath: string): Promise<string> {
    const basename = markdownPath.replace('.md', '');
    const keynoteFile = basename + '.key';
    
    try {
      // Try using md2keynote if available
      await execAsync(`which md2keynote`);
      await execAsync(`md2keynote "${markdownPath}" "${keynoteFile}"`);
      
      if (existsSync(keynoteFile)) {
        console.log('✅ Keynote file created using md2keynote');
        return keynoteFile;
      }
    } catch (error) {
      console.log('md2keynote not available, trying alternative methods...');
    }
    
    try {
      // Try using pandoc to convert to PowerPoint, which can be opened in Keynote
      await execAsync(`which pandoc`);
      const pptxFile = basename + '.pptx';
      await execAsync(`pandoc "${markdownPath}" -o "${pptxFile}"`);
      
      if (existsSync(pptxFile)) {
        console.log('✅ PowerPoint file created using pandoc (can be opened in Keynote)');
        return pptxFile;
      }
    } catch (error) {
      console.log('pandoc not available, creating outline file...');
    }
    
    // If no conversion tools are available, throw error to trigger fallback
    throw new Error('No Keynote conversion tools available');
  }

  private createPresentationMarkdown(
    extractedContent: ExtractedContent,
    processedContent: ProcessedContent
  ): string {
    const { metadata } = extractedContent;
    const { summary, chapters, keyPoints, themes } = processedContent;
    
    let markdown = '';
    
    // Title slide
    markdown += `# ${metadata.title}\n\n`;
    markdown += `## ${metadata.author}\n\n`;
    markdown += `---\n\n`;
    
    // Executive Summary slide
    markdown += `# Executive Summary\n\n`;
    markdown += `${summary.brief}\n\n`;
    markdown += `---\n\n`;
    
    // Key Points slide
    markdown += `# Key Points\n\n`;
    keyPoints.slice(0, 5).forEach((point, index) => {
      markdown += `## ${index + 1}. ${this.truncateText(point, 100)}\n\n`;
    });
    markdown += `---\n\n`;
    
    // Main Themes slide
    markdown += `# Main Themes\n\n`;
    themes.slice(0, 6).forEach(theme => {
      markdown += `## ${theme}\n\n`;
    });
    markdown += `---\n\n`;
    
    // Chapter overview slides
    if (chapters.length > 1) {
      markdown += `# Chapter Overview\n\n`;
      chapters.forEach((chapter, index) => {
        markdown += `## ${chapter.title}\n`;
        markdown += `- ${chapter.wordCount} words\n`;
        if (chapter.mainTopics.length > 0) {
          markdown += `- Topics: ${chapter.mainTopics.slice(0, 3).join(', ')}\n`;
        }
        markdown += `\n`;
      });
      markdown += `---\n\n`;
    }
    
    // Individual chapter slides
    chapters.forEach((chapter, chapterIndex) => {
      if (chapters.length > 1) {
        markdown += `# ${chapter.title}\n\n`;
        markdown += `---\n\n`;
      }
      
      // Chapter summary slide
      markdown += `# ${chapters.length > 1 ? chapter.title + ' - ' : ''}Summary\n\n`;
      markdown += `${this.truncateText(chapter.summary, 300)}\n\n`;
      markdown += `---\n\n`;
      
      // Chapter key points
      if (chapter.keyPoints.length > 0) {
        markdown += `# ${chapters.length > 1 ? chapter.title + ' - ' : ''}Key Points\n\n`;
        chapter.keyPoints.slice(0, 4).forEach((point, index) => {
          markdown += `## ${index + 1}. ${this.truncateText(point, 80)}\n\n`;
        });
        markdown += `---\n\n`;
      }
    });
    
    // Detailed summary slide
    markdown += `# Detailed Analysis\n\n`;
    markdown += `${this.truncateText(summary.detailed, 400)}\n\n`;
    markdown += `---\n\n`;
    
    // Conclusion slide
    markdown += `# Conclusion\n\n`;
    markdown += `## Key Takeaways:\n\n`;
    keyPoints.slice(0, 3).forEach((point, index) => {
      markdown += `- ${this.truncateText(point, 60)}\n`;
    });
    markdown += `\n## Thank You\n\n`;
    
    return markdown;
  }

  private async createKeynoteOutline(
    extractedContent: ExtractedContent,
    processedContent: ProcessedContent,
    outputPath: string
  ): Promise<string> {
    const { metadata } = extractedContent;
    const { summary, chapters, keyPoints, themes } = processedContent;
    
    const filename = this.sanitizeFilename(metadata.title) + '_keynote_outline.txt';
    const fullPath = join(outputPath, filename);
    
    let outline = '';
    outline += `KEYNOTE PRESENTATION OUTLINE\n`;
    outline += `============================\n\n`;
    outline += `Title: ${metadata.title}\n`;
    outline += `Author: ${metadata.author}\n\n`;
    
    outline += `SLIDE STRUCTURE:\n`;
    outline += `================\n\n`;
    
    outline += `Slide 1: Title\n`;
    outline += `  - ${metadata.title}\n`;
    outline += `  - ${metadata.author}\n\n`;
    
    outline += `Slide 2: Executive Summary\n`;
    outline += `  - ${summary.brief}\n\n`;
    
    outline += `Slide 3: Key Points\n`;
    keyPoints.slice(0, 5).forEach((point, index) => {
      outline += `  ${index + 1}. ${this.truncateText(point, 100)}\n`;
    });
    outline += `\n`;
    
    outline += `Slide 4: Main Themes\n`;
    themes.slice(0, 6).forEach(theme => {
      outline += `  • ${theme}\n`;
    });
    outline += `\n`;
    
    if (chapters.length > 1) {
      outline += `Slide 5: Chapter Overview\n`;
      chapters.forEach((chapter, index) => {
        outline += `  • ${chapter.title} (${chapter.wordCount} words)\n`;
      });
      outline += `\n`;
    }
    
    let slideNumber = chapters.length > 1 ? 6 : 5;
    
    chapters.forEach((chapter, chapterIndex) => {
      if (chapters.length > 1) {
        outline += `Slide ${slideNumber++}: ${chapter.title} Summary\n`;
        outline += `  - ${this.truncateText(chapter.summary, 200)}\n\n`;
      }
      
      if (chapter.keyPoints.length > 0) {
        outline += `Slide ${slideNumber++}: ${chapters.length > 1 ? chapter.title + ' - ' : ''}Key Points\n`;
        chapter.keyPoints.slice(0, 4).forEach((point, index) => {
          outline += `  ${index + 1}. ${this.truncateText(point, 80)}\n`;
        });
        outline += `\n`;
      }
    });
    
    outline += `Slide ${slideNumber++}: Detailed Analysis\n`;
    outline += `  - ${this.truncateText(summary.detailed, 300)}\n\n`;
    
    outline += `Slide ${slideNumber}: Conclusion\n`;
    outline += `  - Key Takeaways:\n`;
    keyPoints.slice(0, 3).forEach((point, index) => {
      outline += `    • ${this.truncateText(point, 60)}\n`;
    });
    outline += `  - Thank You\n\n`;
    
    outline += `INSTRUCTIONS FOR KEYNOTE:\n`;
    outline += `=========================\n`;
    outline += `1. Open Keynote and create a new presentation\n`;
    outline += `2. Use the outline above to create slides\n`;
    outline += `3. Copy and paste the content for each slide\n`;
    outline += `4. Add appropriate formatting, images, and transitions\n`;
    outline += `5. Choose a suitable theme that matches your content\n\n`;
    
    outline += `TIPS:\n`;
    outline += `=====\n`;
    outline += `- Keep text concise on each slide\n`;
    outline += `- Use bullet points for better readability\n`;
    outline += `- Consider adding relevant images or diagrams\n`;
    outline += `- Use consistent formatting throughout\n`;
    outline += `- Practice your presentation timing\n`;
    
    writeFileSync(fullPath, outline, 'utf8');
    
    console.log(`✅ Keynote outline created: ${fullPath}`);
    return fullPath;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - 3).trim() + '...';
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }
}