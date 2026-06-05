export interface Part {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

export interface Content {
  role: "user" | "model";
  parts: Part[];
  timestamp?: number;
}

