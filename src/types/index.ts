export interface BookMetadata {
  title: string;
  author: string;
  asin?: string;
}

export interface Chapter {
  title: string;
  content: string;
  pageNumbers: number[];
}

export interface ExtractedContent {
  metadata: BookMetadata;
  chapters: Chapter[];
  fullText: string;
}

export interface ProcessedChapter extends Chapter {
  summary: string;
  keyPoints: string[];
  wordCount: number;
  mainTopics: string[];
}

export interface ProcessedContent {
  summary: ContentSummary;
  chapters: ProcessedChapter[];
  keyPoints: string[];
  themes: string[];
}

export interface ContentSummary {
  brief: string;
  detailed: string;
  executive: string;
}

export interface ScraperConfig {
  headless: boolean;
  timeout: number;
  userDataDir: string;
  viewport: {
    width: number;
    height: number;
  };
}

export type OutputFormat = 'markdown' | 'keynote' | 'both';