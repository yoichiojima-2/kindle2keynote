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
    
    // Extract words using language-appropriate method
    const words = this.extractWords(text);
    const wordCount = new Map<string, number>();
    
    // Count word frequencies
    for (const word of words) {
      if (!this.isStopWord(word) && word.length > 1) {
        const normalizedWord = word.toLowerCase();
        wordCount.set(normalizedWord, (wordCount.get(normalizedWord) || 0) + 1);
      }
    }
    
    // Get top themes by frequency
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => this.isJapaneseText(word) ? word : this.capitalizeWord(word));
    
    return sortedWords;
  }

  private extractSentences(text: string): string[] {
    // Split text into sentences (supports both English and Japanese delimiters)
    return text
      .split(/[.!?。！？]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.length < 500); // Filter out very short/long sentences
  }

  private scoreSentences(sentences: string[], fullText: string): { sentence: string; score: number }[] {
    const words = this.extractWords(fullText);
    const wordFreq = new Map<string, number>();
    
    // Calculate word frequencies
    for (const word of words) {
      if (!this.isStopWord(word) && word.length > 1) {
        const normalizedWord = word.toLowerCase();
        wordFreq.set(normalizedWord, (wordFreq.get(normalizedWord) || 0) + 1);
      }
    }
    
    // Score sentences based on word frequencies
    const scoredSentences = sentences.map(sentence => {
      const sentenceWords = this.extractWords(sentence);
      let score = 0;
      
      for (const word of sentenceWords) {
        const normalizedWord = word.toLowerCase();
        if (wordFreq.has(normalizedWord)) {
          score += wordFreq.get(normalizedWord)!;
        }
      }
      
      // Normalize by sentence length
      score = sentenceWords.length > 0 ? score / sentenceWords.length : 0;
      
      return { sentence, score };
    });
    
    return scoredSentences.sort((a, b) => b.score - a.score);
  }

  private countWords(text: string): number {
    if (this.isJapaneseText(text)) {
      // For Japanese text, count characters instead of space-separated words
      return text.replace(/\s+/g, '').length;
    }
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
    const englishStopWords = new Set([
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

    const japaneseStopWords = new Set([
      'の', 'に', 'は', 'を', 'が', 'と', 'で', 'から', 'まで', 'より',
      'へ', 'や', 'か', 'も', 'だ', 'である', 'です', 'ます', 'た', 'て',
      'この', 'その', 'あの', 'どの', 'これ', 'それ', 'あれ', 'どれ',
      'ここ', 'そこ', 'あそこ', 'どこ', 'こう', 'そう', 'ああ', 'どう',
      'する', 'した', 'して', 'される', 'された', 'されて',
      'いる', 'いた', 'いて', 'ある', 'あった', 'あって',
      'なる', 'なった', 'なって', 'くる', 'きた', 'きて',
      'でも', 'しかし', 'けれど', 'ただし', 'それで', 'そして',
      'また', 'さらに', 'つまり', '例えば', 'ところで', 'ちなみに'
    ]);
    
    return englishStopWords.has(word) || japaneseStopWords.has(word);
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

  private isJapaneseText(text: string): boolean {
    // Check for Japanese characters (Hiragana, Katakana, Kanji)
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(text);
  }

  private extractWords(text: string): string[] {
    if (this.isJapaneseText(text)) {
      return this.segmentJapaneseText(text);
    } else {
      // English word extraction
      return text.toLowerCase().match(/\\b[a-z]+\\b/g) || [];
    }
  }

  private segmentJapaneseText(text: string): string[] {
    // Basic Japanese text segmentation
    const words: string[] = [];
    
    // Split by common delimiters and whitespace
    const chunks = text.split(/[\\s、。！？，]+/).filter(chunk => chunk.length > 0);
    
    for (const chunk of chunks) {
      // Further segment each chunk
      const segmented = this.segmentChunk(chunk);
      words.push(...segmented);
    }
    
    return words.filter(word => word.length > 0);
  }

  private segmentChunk(chunk: string): string[] {
    const words: string[] = [];
    let currentWord = '';
    
    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];
      
      // Check character type
      if (this.isHiragana(char)) {
        // Hiragana - likely particles or grammar words
        if (currentWord && !this.isHiragana(currentWord[currentWord.length - 1])) {
          words.push(currentWord);
          currentWord = char;
        } else {
          currentWord += char;
        }
      } else if (this.isKatakana(char)) {
        // Katakana - likely foreign words
        if (currentWord && !this.isKatakana(currentWord[currentWord.length - 1])) {
          words.push(currentWord);
          currentWord = char;
        } else {
          currentWord += char;
        }
      } else if (this.isKanji(char)) {
        // Kanji - can be combined or separate
        currentWord += char;
      } else {
        // ASCII or other characters
        if (currentWord && this.isJapanese(currentWord[currentWord.length - 1])) {
          words.push(currentWord);
          currentWord = char;
        } else {
          currentWord += char;
        }
      }
    }
    
    if (currentWord) {
      words.push(currentWord);
    }
    
    return words;
  }

  private isHiragana(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= 0x3040 && code <= 0x309F;
  }

  private isKatakana(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= 0x30A0 && code <= 0x30FF;
  }

  private isKanji(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= 0x4E00 && code <= 0x9FAF;
  }

  private isJapanese(char: string): boolean {
    return this.isHiragana(char) || this.isKatakana(char) || this.isKanji(char);
  }
}