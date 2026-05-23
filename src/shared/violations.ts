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

export type ViolationScanStepResult =
  | ({ type: 'violation'; scanned: number } & ViolationMatch)
  | { type: 'done'; scanned?: number; reason?: string }
  | { type: 'stopped'; reason?: string };
