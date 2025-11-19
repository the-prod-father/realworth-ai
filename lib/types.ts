
export interface AppraisalRequest {
  files: File[];
  condition: string;
}

export interface AppraisalResult {
  id: string;
  image: string;
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
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}
