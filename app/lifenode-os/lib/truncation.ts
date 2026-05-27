import { convert } from 'html-to-text';

export function sanitizeAndTruncate(rawHtmlOrText: string, maxChars: number = 12000): string {
  // 1. Convert HTML to clean, structured plain text
  const cleanText = convert(rawHtmlOrText, {
    wordwrap: false,
    selectors: [
      { selector: 'img', format: 'skip' },
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'style', format: 'skip' },
      { selector: 'script', format: 'skip' }
    ]
  });

  // 2. Remove excessive whitespace, newlines, and tabs
  const condensedText = cleanText.replace(/\s+/g, ' ').trim();

  // 3. Apply a hard truncation cap (safe ceiling for context windows)
  if (condensedText.length > maxChars) {
    return condensedText.substring(0, maxChars) + '... [Truncated for Context Optimization]';
  }

  return condensedText;
}
