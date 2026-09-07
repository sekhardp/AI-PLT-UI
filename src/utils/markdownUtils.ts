/**
 * Normalizes Markdown content received from LLMs or APIs before rendering.
 * 
 * Safely handles single-line concatenated table rows (e.g. `| col1 | col2 | | --- | --- | | val1 | val2 |`)
 * and ensures table delimiters have clean line breaks, while leaving code blocks and normal
 * text formatting completely untouched.
 */

export function normalizeMarkdown(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  // 1. Separate fenced code blocks and inline code to preserve them verbatim
  const codeBlocks: string[] = [];
  let text = raw.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // 2. Fix inline concatenated table rows:
  // When multiple table rows are placed on one line separated by '| |' or '|  |'
  // e.g., "| col1 | col2 | | --- | --- | | val1 | val2 |"
  text = text.replace(/\|\s*\|\s*(?=[^|\n]+?\|)/g, '|\n| ');

  // 3. Ensure delimiter rows like "|---|---|" start on their own line if attached to header
  text = text.replace(/([^\n])\s*(\|(?:\s*:?-+:?\s*\|)+)/g, '$1\n$2');

  // Restore code blocks verbatim
  return text.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)] ?? '');
}
