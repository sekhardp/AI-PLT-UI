/**
 * Normalizes Markdown content received from LLMs or APIs before rendering.
 * 
 * Safely handles single-line concatenated table rows (e.g. `| col1 | col2 | | --- | --- | | val1 | val2 |`)
 * and ensures table delimiters have clean line breaks, while leaving code blocks and normal
 * text formatting completely untouched.
 * 
 * When isStreaming is true, automatically closes unclosed code blocks so ReactMarkdown
 * can parse them properly during real-time streaming.
 */

export function normalizeMarkdown(raw: string, isStreaming?: boolean): string {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw;

  // If streaming and there is an unclosed code block, temporarily close it so ReactMarkdown parses it cleanly
  if (isStreaming) {
    const codeBlockCount = (text.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      text = text + '\n```';
    }
  }

  // If the raw text contains slide deck JSON without ``` code fences, fence it automatically
  if (
    !text.includes('```') &&
    (text.includes('"slides"') || text.includes('"deck_title"') || text.includes('"kpi_cards"'))
  ) {
    const firstBrace = text.indexOf('{');
    if (firstBrace !== -1) {
      const prefix = text.slice(0, firstBrace).trimEnd();
      const jsonPortion = text.slice(firstBrace);
      text = prefix
        ? `${prefix}\n\n\`\`\`json\n${jsonPortion}\n\`\`\``
        : `\`\`\`json\n${jsonPortion}\n\`\`\``;
    }
  }

  // 1. Separate fenced code blocks and inline code to preserve them verbatim
  const codeBlocks: string[] = [];
  text = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // 2. Fix inline concatenated table rows:
  text = text.replace(/\|\s*\|\s*(?=[^|\n]+?\|)/g, '|\n| ');

  // 3. Ensure delimiter rows like "|---|---|" start on their own line if attached to header
  text = text.replace(/([^\n])\s*(\|(?:\s*:?-+:?\s*\|)+)/g, '$1\n$2');

  // Restore code blocks verbatim
  return text.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)] ?? '');
}
