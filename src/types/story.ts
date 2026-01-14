// Page count mapping based on story length
export const PAGE_COUNTS = {
  short: 5,
  medium: 7,
  long: 10,
} as const;

// Individual page structure
export interface StoryPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  imageUrl?: string;
  imageStatus: "pending" | "loading" | "loaded" | "error";
}

// Generated story structure
export interface GeneratedStory {
  title: string;
  pages: StoryPage[];
  coverImageUrl?: string;
}

// Story options from form
export interface StoryOptions {
  childName: string;
  age: "baby" | "toddler" | "preschool" | "early-reader";
  length: "short" | "medium" | "long";
  theme:
    | "adventure"
    | "animals"
    | "fantasy"
    | "space"
    | "friendship"
    | "silly"
    | "nature"
    | "ocean";
  tone: "soothing" | "exciting";
  rhyming: boolean;
}

// API response from story generation
export interface StoryApiResponse {
  title: string;
  pages: Array<{
    pageNumber: number;
    text: string;
    imagePrompt: string;
  }>;
}

// Loading state for progressive generation
export interface LoadingState {
  stage: "idle" | "generating-story" | "generating-images" | "complete";
  storyComplete: boolean;
  imagesComplete: number;
  imagesTotal: number;
}
