import { useState, useRef, useMemo } from 'react';
import { Table, Copy, Check, Download, Code as CodeIcon, Presentation, Loader2 } from 'lucide-react';
import { SlideDeckViewer } from './SlideDeckViewer';
import type { SlideDeck } from '../types';

// ─── Table Component with Actions ───────────────────────────────────────────

export function MarkdownTable({ node: _node, children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to extract table text for copying/exporting
  const extractTableData = (): string[][] => {
    if (!containerRef.current) return [];
    const rows = containerRef.current.querySelectorAll('tr');
    const data: string[][] = [];
    rows.forEach((row) => {
      const cells = row.querySelectorAll('th, td');
      const rowData: string[] = [];
      cells.forEach((cell) => {
        rowData.push(cell.textContent?.trim() || '');
      });
      if (rowData.length > 0) {
        data.push(rowData);
      }
    });
    return data;
  };

  const handleCopy = () => {
    const data = extractTableData();
    if (data.length === 0) return;
    const tsv = data.map((row) => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadCSV = () => {
    const data = extractTableData();
    if (data.length === 0) return;
    const csv = data
      .map((row) =>
        row
          .map((cell) => {
            const escaped = cell.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `table_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="markdown-table-card" ref={containerRef}>
      <div className="table-toolbar">
        <div className="table-toolbar-left">
          <Table size={13} className="table-toolbar-icon" />
          <span className="table-toolbar-title">Data Table</span>
        </div>
        <div className="table-toolbar-actions">
          <button
            type="button"
            className="table-action-btn"
            onClick={handleCopy}
            title="Copy table data (TSV / Spreadsheet format)"
            aria-label="Copy table data"
          >
            {copied ? (
              <>
                <Check size={12} color="var(--success, #10b981)" />
                <span style={{ color: 'var(--success, #10b981)' }}>Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="table-action-btn"
            onClick={handleDownloadCSV}
            title="Download table as CSV"
            aria-label="Download CSV"
          >
            <Download size={12} />
            <span>CSV</span>
          </button>
        </div>
      </div>
      <div className="markdown-table-scroll">
        <table {...props}>{children}</table>
      </div>
    </div>
  );
}

// ─── Table Cell Component (Smart Badges & Monospace) ──────────────────────────

export function MarkdownTableCell({
  node: _node,
  children,
  ...props
}: any) {
  if (typeof children === 'string') {
    const trimmed = children.trim();
    const upper = trimmed.toUpperCase();

    // Success badge
    if (upper === 'SUCCESS' || upper === 'COMPLETE' || upper === 'COMPLETED' || upper === 'PASSED') {
      return (
        <td {...props}>
          <span className="cell-badge cell-badge-success">{trimmed}</span>
        </td>
      );
    }

    // Error / Failure badge
    if (upper === 'FAILED' || upper === 'FAIL' || upper === 'ERROR' || upper === 'FAILED_VALIDATION') {
      return (
        <td {...props}>
          <span className="cell-badge cell-badge-error">{trimmed}</span>
        </td>
      );
    }

    // Null / None badge
    if (upper === 'NULL' || upper === 'NONE' || upper === 'N/A' || upper === 'NIL') {
      return (
        <td {...props}>
          <span className="cell-badge cell-badge-null">{trimmed}</span>
        </td>
      );
    }

    // MD5 Hash or long alphanumeric hex
    if (/^[a-f0-9]{32}$/i.test(trimmed)) {
      return (
        <td {...props}>
          <span className="cell-mono cell-hash" title={trimmed}>
            {trimmed}
          </span>
        </td>
      );
    }

    // Timestamps
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(trimmed)) {
      return (
        <td {...props}>
          <span className="cell-mono cell-time" title={trimmed}>
            {trimmed}
          </span>
        </td>
      );
    }

    // Numbers / Integer IDs
    if (/^-?\d+$/.test(trimmed)) {
      return (
        <td {...props}>
          <span className="cell-mono cell-num">{trimmed}</span>
        </td>
      );
    }
  }

  return <td {...props}>{children}</td>;
}

// ─── Fenced Code Block with Auto Slide Deck Renderer ─────────────────────────

export function MarkdownPreBlock({
  node: _node,
  children,
  isStreaming,
  ...props
}: any) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  let language = '';
  let rawContent = '';

  if (children && typeof children === 'object' && 'props' in children) {
    const className = children.props?.className || '';
    const match = /language-(\w+)/.exec(className);
    if (match) language = match[1];

    if (typeof children.props?.children === 'string') {
      rawContent = children.props.children;
    } else if (Array.isArray(children.props?.children)) {
      rawContent = children.props.children.join('');
    }
  }

  const isSlideDeckJson = useMemo(() => {
    if (!rawContent) return false;
    const lower = rawContent.toLowerCase();
    return (
      (lower.includes('"slides"') || lower.includes('"deck_title"') || lower.includes('"kpi_cards"')) &&
      (language === 'json' || rawContent.trim().startsWith('{') || rawContent.trim().startsWith('```'))
    );
  }, [rawContent, language]);

  // Detect if code block is a valid SlideDeck schema
  const detectedDeck = useMemo<SlideDeck | null>(() => {
    if (!rawContent || (!rawContent.includes('"slides"') && !rawContent.includes('"deck_title"'))) return null;
    let jsonStr = rawContent.trim();
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      jsonStr = match[0];
    }
    try {
      // Remove trailing commas before } or ]
      const cleaned = jsonStr.replace(/,\s*([\]}])/g, '$1');
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object') {
        const slides = Array.isArray(parsed.slides) ? parsed.slides : null;
        if (slides && slides.length > 0) {
          const deckTitle =
            typeof parsed.deck_title === 'string'
              ? parsed.deck_title
              : typeof parsed.title === 'string'
              ? parsed.title
              : slides[0]?.title || 'Executive Presentation';

          return {
            deck_title: deckTitle,
            deck_subtitle: parsed.deck_subtitle || parsed.subtitle,
            theme: parsed.theme || 'dark',
            author: parsed.author || 'AI Platform Orchestrator',
            slides,
            sources_summary: parsed.sources_summary || [],
          } as SlideDeck;
        }
      }
    } catch {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === 'object') {
          const slides = Array.isArray(parsed.slides) ? parsed.slides : null;
          if (slides && slides.length > 0) {
            return {
              deck_title: parsed.deck_title || parsed.title || slides[0]?.title || 'Executive Presentation',
              deck_subtitle: parsed.deck_subtitle || parsed.subtitle,
              theme: parsed.theme || 'dark',
              author: parsed.author || 'AI Platform Orchestrator',
              slides,
              sources_summary: parsed.sources_summary || [],
            } as SlideDeck;
          }
        }
      } catch {
        // not a json slide deck or still streaming
      }
    }
    return null;
  }, [rawContent]);

  // While streaming: if it's a slide deck payload being generated, show the sleek slide deck synthesis progress card instead of raw JSON!
  if (isStreaming && isSlideDeckJson) {
    return (
      <div className="slide-deck-generating-card" aria-live="polite">
        <div className="slide-deck-generating-header">
          <div className="slide-deck-icon-badge">
            <Presentation size={15} />
          </div>
          <div className="slide-deck-generating-info">
            <span className="slide-deck-generating-title">
              Synthesizing Executive Presentation Deck…
            </span>
            <span className="slide-deck-generating-sub">
              Compiling BigQuery KPI scorecards, trend charts, and strategic insights into 16:9 slides
            </span>
          </div>
          <span className="slide-deck-generating-badge">
            <Loader2 size={12} className="spin-fast" /> Building slides…
          </span>
        </div>
        <div className="slide-deck-generating-progress-bar">
          <div className="slide-deck-progress-shimmer" />
        </div>
      </div>
    );
  }

  // If it's a valid slide deck, render the interactive SlideDeckViewer widget!
  if (detectedDeck) {
    return <SlideDeckViewer deck={detectedDeck} />;
  }

  const handleCopyCode = () => {
    const rawCode = rawContent || preRef.current?.textContent || '';
    navigator.clipboard.writeText(rawCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="code-block-card">
      <div className="code-block-toolbar">
        <div className="code-block-lang">
          <CodeIcon size={12} />
          <span>{language || 'code'}</span>
        </div>
        <button
          type="button"
          className="code-copy-btn"
          onClick={handleCopyCode}
          aria-label="Copy code to clipboard"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} color="var(--success, #10b981)" />
              <span style={{ color: 'var(--success, #10b981)' }}>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre ref={preRef} className="code-block-pre" {...props}>
        {children}
      </pre>
    </div>
  );
}
