declare module "html-to-text" {
  export type SelectorRule = {
    selector: string;
    format?: string;
    options?: Record<string, unknown>;
  };

  export type ConvertOptions = {
    wordwrap?: boolean | number;
    selectors?: SelectorRule[];
  };

  export function convert(input: string, options?: ConvertOptions): string;
}
