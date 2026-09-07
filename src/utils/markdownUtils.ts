/**
 * Normalizes Markdown content received from LLMs or APIs before rendering.
 * 
 * LLMs (especially local models like Qwen / Llama) occasionally output table rows
 * concatenated on a single line (e.g. `| col1 | col2 | | --- | --- | | val1 | val2 |`)
 * or omit the required newlines before/after table blocks.
 * 
 * This utility safely restores standard GFM table structure without touching code blocks.
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
  text = text.replace(/\|\s*\|\s*/g, '|\n| ');

  // 3. Ensure delimiter rows like "|---|---|" start on their own line if attached to header
  // e.g. "| col1 | col2 ||---|---|" -> "| col1 | col2 |\n|---|---|"
  text = text.replace(/([^\n])\s*(\|(?:\s*:?-+:?\s*\|)+)/g, '$1\n$2');

  // 4. Ensure a markdown table starts on a new line if preceded by inline text
  // e.g. "Here is the table: | col1 | col2 |\n|---|---|" -> "Here is the table:\n\n| col1 | col2 |\n|---|---|"
  text = text.replace(/([^\n])\s*(\|[^\n|]+\|(?:[^\n|]+\|)*\n\s*\|(?:\s*:?-+:?\s*\|)+)/g, '$1\n\n$2');

  // 5. Ensure trailing text after the last table row starts on a new paragraph
  // e.g. "| val1 | val2 |\n| val3 | val4 | All entries show..." -> "...|\n\nAll entries show..."
  text = text.replace(/(\|\s*)\n?([A-Za-z0-9][^\n|]*)$/gm, (match, p1, p2) => {
    // If p2 does not contain table pipes, it is ordinary text following the table
    if (!p2.includes('|')) {
      return `${p1}\n\n${p2}`;
    }
    return match;
  });

  // Restore code blocks verbatim
  return text.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)] ?? '');
}
