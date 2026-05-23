export interface ViolationMatch {
  productId: string;
  title: string;
  matchedWords: string[];
}

export interface ViolationScanResult {
  scanned: number;
  violations: ViolationMatch[];
  errors: number;
  stopped: boolean;
  reason?: string;
}

