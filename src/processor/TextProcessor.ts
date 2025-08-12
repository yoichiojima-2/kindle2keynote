import { ExtractedContent, Chapter, ProcessedContent, ContentSummary, ProcessedChapter } from '../types';

export class TextProcessor {
  private chunkSize: number;

  constructor(chunkSize: number = 2000) {
    this.chunkSize = chunkSize;
  }

  async processContent(content: ExtractedContent): Promise<ProcessedContent> {
    console.log('🧠 Processing extracted content...');
    
    const chapters = await this.processChapters(content.chapters);
    const summary = await this.generateSummary(content.fullText);
    const keyPoints = this.extractKeyPoints(content.fullText);
    const themes = this.identifyThemes(content.fullText);
    
    return {
      summary,
      chapters,
      keyPoints,
      themes
    };
  }

  private async processChapters(chapters: Chapter[]): Promise<ProcessedChapter[]> {
    console.log(`📚 Processing ${chapters.length} chapters...`);
    
    const processedChapters: ProcessedChapter[] = [];
    
    for (const chapter of chapters) {
      const processed: ProcessedChapter = {
        ...chapter,
        summary: await this.summarizeChapter(chapter.content),
        keyPoints: this.extractKeyPoints(chapter.content),
        wordCount: this.countWords(chapter.content),
        mainTopics: this.extractTopics(chapter.content)
      };
      
      processedChapters.push(processed);
    }
    
    return processedChapters;
  }

  private async generateSummary(text: string): Promise<ContentSummary> {
    console.log('📝 Generating content summaries...');
    
    // For now, use extractive summarization
    // TODO: Integrate with AI APIs (OpenAI, Anthropic, etc.)
    const sentences = this.extractSentences(text);
    const scoredSentences = this.scoreSentences(sentences, text);
    
    const briefSentences = scoredSentences.slice(0, 3);
    const detailedSentences = scoredSentences.slice(0, 8);
    const executiveSentences = scoredSentences.slice(0, 5);
    
    return {
      brief: briefSentences.map(s => s.sentence).join(' '),
      detailed: detailedSentences.map(s => s.sentence).join(' '),
      executive: executiveSentences.map(s => s.sentence).join(' ')
    };
  }

  private async summarizeChapter(text: string): Promise<string> {
    // Simple extractive summarization for chapters
    const sentences = this.extractSentences(text);
    const scoredSentences = this.scoreSentences(sentences, text);
    
    const topSentences = scoredSentences.slice(0, 3);
    return topSentences.map(s => s.sentence).join(' ');
  }

  private extractKeyPoints(text: string): string[] {
    console.log('🔍 Extracting key points...');
    
    const sentences = this.extractSentences(text);
    const keyPoints: string[] = [];
    
    // Look for sentences that start with key indicator words
    const keywordPatterns = [
      /^(The main|The primary|The key|The important|The significant)/i,
      /^(In summary|In conclusion|To summarize|Overall)/i,
      /^(This means|This suggests|This indicates|This shows)/i,
      /^(Therefore|Consequently|As a result|Thus)/i
    ];
    
    for (const sentence of sentences) {
      for (const pattern of keywordPatterns) {
        if (pattern.test(sentence)) {
          keyPoints.push(sentence);
          break;
        }
      }
    }
    
    // If no pattern-based key points found, use top-scored sentences
    if (keyPoints.length === 0) {
      const scoredSentences = this.scoreSentences(sentences, text);
      keyPoints.push(...scoredSentences.slice(0, 5).map(s => s.sentence));
    }
    
    return keyPoints.slice(0, 10); // Limit to 10 key points
  }

  private identifyThemes(text: string): string[] {
    console.log('🎭 Identifying themes...');
    
    // Simple keyword extraction for themes
    const words = text.toLowerCase().match(/\\b[a-z]{4,}\\b/g) || [];
    const wordCount = new Map<string, number>();
    
    // Count word frequencies
    for (const word of words) {
      if (!this.isStopWord(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }
    
    // Get top themes by frequency
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => this.capitalizeWord(word));
    
    return sortedWords;
  }

  private extractSentences(text: string): string[] {
    // Split text into sentences
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.length < 500); // Filter out very short/long sentences
  }

  private scoreSentences(sentences: string[], fullText: string): { sentence: string; score: number }[] {
    const words = fullText.toLowerCase().match(/\\b[a-z]+\\b/g) || [];
    const wordFreq = new Map<string, number>();
    
    // Calculate word frequencies
    for (const word of words) {
      if (!this.isStopWord(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }
    
    // Score sentences based on word frequencies
    const scoredSentences = sentences.map(sentence => {
      const sentenceWords = sentence.toLowerCase().match(/\\b[a-z]+\\b/g) || [];
      let score = 0;
      
      for (const word of sentenceWords) {
        if (wordFreq.has(word)) {
          score += wordFreq.get(word)!;
        }
      }
      
      // Normalize by sentence length
      score = score / sentenceWords.length;
      
      return { sentence, score };
    });
    
    return scoredSentences.sort((a, b) => b.score - a.score);
  }

  private countWords(text: string): number {
    return text.split(/\\s+/).filter(word => word.length > 0).length;
  }

  private extractTopics(text: string): string[] {
    // Simple topic extraction based on noun phrases
    const topics: string[] = [];
    
    // Look for capitalized words that might be topics
    const matches = text.match(/\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\b/g) || [];
    const topicCount = new Map<string, number>();
    
    for (const match of matches) {
      if (match.length > 3 && !this.isCommonProperNoun(match)) {
        topicCount.set(match, (topicCount.get(match) || 0) + 1);
      }
    }
    
    return Array.from(topicCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
      'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
      'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
      'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would',
      'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
      'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can',
      'like', 'time', 'no', 'just', 'him', 'know', 'take',
      'people', 'into', 'year', 'your', 'good', 'some', 'could',
      'them', 'see', 'other', 'than', 'then', 'now', 'look',
      'only', 'come', 'its', 'over', 'think', 'also', 'back',
      'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well',
      'way', 'even', 'new', 'want', 'because', 'any', 'these',
      'give', 'day', 'most', 'us'
    ]);
    
    return stopWords.has(word);
  }

  private isCommonProperNoun(word: string): boolean {
    const commonProperNouns = new Set([
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
      'America', 'American', 'English', 'Internet', 'Google', 'Facebook',
      'Twitter', 'Microsoft', 'Apple', 'Amazon'
    ]);
    
    return commonProperNouns.has(word);
  }

  private capitalizeWord(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}