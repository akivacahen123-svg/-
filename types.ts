export interface ContentIdea {
  headline: string;
  image_prompt: string;
}

export interface GeneratedResult {
  headline: string;
  imageUrl: string;
}

export type AspectRatio = '1:1' | '4:3' | '3:4';

export type TextStyle = 'default' | 'teaser' | 'newsy' | 'formal';
