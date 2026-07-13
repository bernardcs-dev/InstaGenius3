export interface LayoutStructure {
  composition: string;
  positioning: string;
  overlayStyles: string;
  spacing: string;
}

export interface StyleAnalysis {
  colorPalette: string[];
  typography: string;
  visualStyle: string;
  mood: string;
  layoutStructure: LayoutStructure;
}

export interface GeneratedImage {
  url: string;
  base64: string;
}

export interface LayoutSuggestion {
  id: string;
  name: string;
  description: string;
  composition: string;
  positioning: string;
}

export interface TextStyle {
  font: string;
  color: string;
  size: string;
}

export interface PostContent {
  headline: string;
  headlineStyle: TextStyle;
  subtitle: string;
  subtitleStyle: TextStyle;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  image: string; // Base64
  format: PostFormat;
  cost: number;
  caption: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  READY_TO_PLAN = 'READY_TO_PLAN',
  PLANNING = 'PLANNING',
  REVIEWING_PLAN = 'REVIEWING_PLAN',
  READY_TO_GENERATE = 'READY_TO_GENERATE',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface UploadedImage {
  id: string;
  base64: string;
  mimeType: string;
  preview: string;
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "4:5";

export enum PostFormat {
  STORY = 'STORY',
  FEED_STATIC = 'FEED_STATIC',
  FEED_CAROUSEL = 'FEED_CAROUSEL',
  LANDSCAPE = 'LANDSCAPE'
}

export type CarouselCount = 4 | 5 | 6;

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
export type LogoOpacity = 'solid' | 'translucent';
export type LogoSize = 'small' | 'medium' | 'large';

export interface GeneratedPost {
  images: string[]; // Base64 strings
  format: PostFormat;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
