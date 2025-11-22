
export interface AppraisalRequest {
  files: File[];
  condition: string;
}

export interface Reference {
  title: string;
  url: string;
}

export interface AppraisalResult {
  id: string;
  image: string; // Primary/result image (backward compatible)
  images?: string[]; // All images (uploads + result)
  itemName: string;
  author?: string;
  era: string;
  category: string;
  description: string;
  priceRange: {
    low: number;
    high: number;
  };
  currency: string;
  reasoning: string;
  references?: Reference[];
  timestamp: number;
  isPublic?: boolean; // Whether this treasure is publicly shareable
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}
