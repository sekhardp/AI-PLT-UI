import { useState } from 'react';
import {
  Presentation,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Code,
  Check,
  BarChart2,
  Table as TableIcon,
  Columns,
  Sparkles,
} from 'lucide-react';
import type { SlideDeck, Slide } from '../types';
import { exportPresentationPptx } from '../api';

interface SlideDeckViewerProps {
  deck: SlideDeck;
  initialSlide?: number;
}


// Helper to normalize slide properties to support LLM JSON variances
function normalizeSlideData(rawSlide: any): Slide {
  if (!rawSlide) return rawSlide;

  // Extract bullet points from bullets, bullet_points, points, takeaways, or cards
  const bulletPoints: string[] = [];
  const rawBullets = rawSlide.bullet_points || rawSlide.bullets || rawSlide.takeaways || rawSlide.points || [];
  if (Array.isArray(rawBullets)) {
    for (const b of rawBullets) {
      if (typeof b === "string") {
        bulletPoints.push(b);
      } else if (b && typeof b === "object") {
        bulletPoints.push(b.content || b.text || b.title || "");
      }
    }
  }

  if (Array.isArray(rawSlide.cards)) {
    for (const c of rawSlide.cards) {
      if (typeof c === "string") {
        bulletPoints.push(c);
      } else if (c && typeof c === "object") {
        const prefix = c.title ? `${c.title}: ` : "";
        bulletPoints.push(`${prefix}${c.content || c.text || ""}`.trim());
      }
    }
  }

  // Normalize KPI cards
  const rawKpis = rawSlide.kpi_cards || rawSlide.kpis || [];
  const kpiCards = Array.isArray(rawKpis)
    ? rawKpis.map((k: any) => ({
        label: k.label || k.title || k.name || "Metric",
        value: String(k.value ?? k.val ?? "0"),
        change: k.change || k.delta || k.delta_yoy || k.delta_qoq || undefined,
        trend: k.trend || (String(k.change || k.delta || k.delta_yoy || "").includes("-") ? "down" : "up"),
      }))
    : [];

  // Normalize two-column content
  let leftTitle = rawSlide.left_column_title;
  let leftBullets = Array.isArray(rawSlide.left_column_bullets) ? [...rawSlide.left_column_bullets] : [];
  if (rawSlide.left_column && typeof rawSlide.left_column === "object") {
    leftTitle = rawSlide.left_column.title || leftTitle;
    const rawC = rawSlide.left_column.content || "";
    if (typeof rawC === "string") {
      const parts = rawC.replace(/<br\s*[/]?>/gi, "\n").split("\n").map((s: string) => s.trim()).filter(Boolean);
      leftBullets.push(...parts);
    } else if (Array.isArray(rawC)) {
      leftBullets.push(...rawC.map(String));
    }
  }

  let rightTitle = rawSlide.right_column_title;
  let rightBullets = Array.isArray(rawSlide.right_column_bullets) ? [...rawSlide.right_column_bullets] : [];
  if (rawSlide.right_column && typeof rawSlide.right_column === "object") {
    rightTitle = rawSlide.right_column.title || rightTitle;
    const rawC = rawSlide.right_column.content || "";
    if (typeof rawC === "string") {
      const parts = rawC.replace(/<br\s*[/]?>/gi, "\n").split("\n").map((s: string) => s.trim()).filter(Boolean);
      rightBullets.push(...parts);
    } else if (Array.isArray(rawC)) {
      rightBullets.push(...rawC.map(String));
    }
  }

  // Normalize chart
  let chart = rawSlide.chart;
  if (chart && typeof chart === "object") {
    chart = {
      chart_type: chart.chart_type || chart.type || "bar",
      title: chart.title,
      categories: Array.isArray(chart.categories)
        ? chart.categories.map(String)
        : Array.isArray(chart.labels)
        ? chart.labels.map(String)
        : [],
      series: Array.isArray(chart.series)
        ? chart.series.map((s: any) => ({
            name: s.name || s.label || "Series",
            values: Array.isArray(s.values)
              ? s.values.map(Number)
              : Array.isArray(s.data)
              ? s.data.map(Number)
              : [],
          }))
        : [],
    };
  }

  return {
    ...rawSlide,
    slide_number: rawSlide.slide_number || 1,
    layout: rawSlide.layout || "bullet_cards",
    title: rawSlide.title || rawSlide.header || "Executive Briefing",
    subtitle: rawSlide.subtitle || rawSlide.description,
    bullet_points: bulletPoints,
    kpi_cards: kpiCards,
    left_column_title: leftTitle,
    left_column_bullets: leftBullets,
    right_column_title: rightTitle,
    right_column_bullets: rightBullets,
    chart,
  };
}

export function SlideDeckViewer({ deck, initialSlide = 0 }: SlideDeckViewerProps) {
  const [currentIdx, setCurrentIdx] = useState(initialSlide);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const slides = deck.slides || [];
  const currentSlide: Slide | undefined = slides[currentIdx] ? normalizeSlideData(slides[currentIdx]) : undefined;

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      await exportPresentationPptx(deck);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export PPTX:', err);
      alert('Failed to export PPTX presentation.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!slides.length) {
    return (
      <div className="slide-deck-empty">
        <Presentation size={24} />
        <span>No slides found in presentation.</span>
      </div>
    );
  }

  return (
    <div className="slide-deck-container">
      {/* Top Deck Toolbar */}
      <div className="slide-deck-toolbar">
        <div className="slide-deck-toolbar-left">
          <div className="slide-deck-icon-badge">
            <Presentation size={15} />
          </div>
          <div className="slide-deck-title-group">
            <span className="slide-deck-title">{deck.deck_title}</span>
            {deck.deck_subtitle && (
              <span className="slide-deck-subtitle">{deck.deck_subtitle}</span>
            )}
          </div>
        </div>

        <div className="slide-deck-toolbar-actions">
          <button
            type="button"
            className={`slide-deck-btn secondary ${showRawJson ? 'active' : ''}`}
            onClick={() => setShowRawJson(!showRawJson)}
            title="Toggle Raw JSON View"
          >
            <Code size={13} />
            <span>{showRawJson ? 'Slides' : 'JSON'}</span>
          </button>

          <button
            type="button"
            className="slide-deck-btn primary"
            onClick={handleDownload}
            disabled={isExporting}
            title="Download editable PowerPoint (.pptx)"
          >
            {exportSuccess ? (
              <>
                <Check size={13} color="#10b981" />
                <span style={{ color: '#10b981' }}>Downloaded!</span>
              </>
            ) : isExporting ? (
              <>
                <span className="slide-spinner" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Download .pptx</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showRawJson ? (
        <pre className="slide-deck-raw-json">
          {JSON.stringify(deck, null, 2)}
        </pre>
      ) : (
        <>
          {/* Main 16:9 Slide Canvas */}
          <div className="slide-canvas">
            {currentSlide && (
              <div className="slide-content-wrapper">
                {/* Slide Header */}
                {currentSlide.layout !== 'title_slide' && (
                  <div className="slide-header">
                    <div className="slide-header-text">
                      <h3 className="slide-title">{currentSlide.title}</h3>
                      {currentSlide.subtitle && (
                        <p className="slide-subtitle">{currentSlide.subtitle}</p>
                      )}
                    </div>
                    <div className="slide-layout-pill">
                      {currentSlide.layout === 'kpi_grid' && <Layers size={11} />}
                      {currentSlide.layout === 'chart_and_bullets' && <BarChart2 size={11} />}
                      {currentSlide.layout === 'two_column_comparison' && <Columns size={11} />}
                      {currentSlide.layout === 'table_slide' && <TableIcon size={11} />}
                      <span>{currentSlide.layout.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                )}

                {/* Slide Body by Layout */}
                <div className="slide-body">
                  {/* 1. Title Slide Layout */}
                  {currentSlide.layout === 'title_slide' && (
                    <div className="layout-title-slide">
                      <div className="title-accent-bar" />
                      <h2 className="title-main">{currentSlide.title}</h2>
                      {currentSlide.subtitle && (
                        <p className="title-sub">{currentSlide.subtitle}</p>
                      )}
                      <div className="title-footer-meta">
                        <span className="title-badge">
                          <Sparkles size={11} /> Executive Briefing
                        </span>
                        <span className="title-author">
                          Prepared by: {deck.author || 'AI Platform Agent'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. KPI Grid Layout */}
                  {currentSlide.layout === 'kpi_grid' && (
                    <div className="layout-kpi-grid">
                      {currentSlide.kpi_cards && currentSlide.kpi_cards.length > 0 && (
                        <div className="kpi-cards-row">
                          {currentSlide.kpi_cards.map((kpi, idx) => (
                            <div key={idx} className="kpi-card-box">
                              <span className="kpi-card-label">{kpi.label}</span>
                              <div className="kpi-card-value">{kpi.value}</div>
                              {kpi.change && (
                                <div
                                  className={`kpi-card-change ${
                                    kpi.trend === 'down' ? 'down' : 'up'
                                  }`}
                                >
                                  {kpi.trend === 'down' ? (
                                    <TrendingDown size={12} />
                                  ) : (
                                    <TrendingUp size={12} />
                                  )}
                                  <span>{kpi.change}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {currentSlide.bullet_points && currentSlide.bullet_points.length > 0 && (
                        <div className="kpi-bullets-box">
                          <ul className="slide-bullets-list">
                            {currentSlide.bullet_points.map((bullet, idx) => (
                              <li key={idx}>
                                <span className="bullet-dot" />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Chart & Bullets Layout */}
                  {currentSlide.layout === 'chart_and_bullets' && (
                    <div className="layout-chart-bullets">
                      <div className="chart-preview-box">
                        <div className="chart-preview-header">
                          <BarChart2 size={13} />
                          <span>{currentSlide.chart?.title || 'Data Metrics Visualizer'}</span>
                        </div>

                        {currentSlide.chart?.categories && (
                          <div className="chart-bars-container">
                            {currentSlide.chart.categories.map((cat, catIdx) => {
                              const seriesValues = currentSlide.chart?.series?.map(
                                (s) => Number(s.values[catIdx]) || 0
                              ) || [0];
                              const maxVal = Math.max(
                                1,
                                ...(currentSlide.chart?.series?.flatMap((s) =>
                                  s.values.map((v) => Number(v) || 0)
                                ) || [1])
                              );

                              return (
                                <div key={catIdx} className="chart-bar-group">
                                  <div className="chart-bar-bars">
                                    {seriesValues.map((val, sIdx) => {
                                      const pct = Math.min(100, Math.max(8, (val / maxVal) * 100));
                                      const colors = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24'];
                                      return (
                                        <div
                                          key={sIdx}
                                          className="chart-single-bar"
                                          style={{
                                            height: `${pct}%`,
                                            backgroundColor: colors[sIdx % colors.length],
                                          }}
                                          title={`${currentSlide.chart?.series[sIdx]?.name || 'Series'}: ${val}`}
                                        >
                                          <span className="chart-bar-val">{val}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <span className="chart-bar-label">{cat}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {currentSlide.chart?.series && currentSlide.chart.series.length > 1 && (
                          <div className="chart-legend-row">
                            {currentSlide.chart.series.map((s, sIdx) => {
                              const colors = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24'];
                              return (
                                <div key={sIdx} className="chart-legend-item">
                                  <span
                                    className="legend-dot"
                                    style={{ backgroundColor: colors[sIdx % colors.length] }}
                                  />
                                  <span>{s.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="chart-bullets-side">
                        <span className="side-box-title">Key Takeaways</span>
                        <ul className="slide-bullets-list">
                          {currentSlide.bullet_points?.map((b, idx) => (
                            <li key={idx}>
                              <span className="bullet-dot" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* 4. Two Column Comparison Layout */}
                  {currentSlide.layout === 'two_column_comparison' && (
                    <div className="layout-two-columns">
                      <div className="column-card left">
                        <span className="column-title">
                          {currentSlide.left_column_title || 'Quantitative Analysis (BigQuery)'}
                        </span>
                        <ul className="slide-bullets-list">
                          {currentSlide.left_column_bullets?.map((b, idx) => (
                            <li key={idx}>
                              <span className="bullet-dot" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="column-card right">
                        <span className="column-title">
                          {currentSlide.right_column_title || 'Qualitative Insights (RAG Docs)'}
                        </span>
                        <ul className="slide-bullets-list">
                          {currentSlide.right_column_bullets?.map((b, idx) => (
                            <li key={idx}>
                              <span className="bullet-dot" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* 5. Table Layout */}
                  {currentSlide.layout === 'table_slide' && (
                    <div className="layout-table-slide">
                      {currentSlide.table && (
                        <div className="slide-table-scroll">
                          <table className="slide-table">
                            <thead>
                              <tr>
                                {currentSlide.table.headers.map((h, i) => (
                                  <th key={i}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {currentSlide.table.rows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. Strategic Bullet Cards Layout */}
                  {currentSlide.layout === 'bullet_cards' && (
                    <div className="layout-bullet-cards">
                      {currentSlide.bullet_points?.map((bullet, idx) => (
                        <div key={idx} className="pillar-card">
                          <span className="pillar-badge">PILLAR 0{idx + 1}</span>
                          <p className="pillar-text">{bullet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Slide Footer with Sources & Slide Number */}
                <div className="slide-footer">
                  <div className="slide-sources">
                    {currentSlide.sources && currentSlide.sources.length > 0 && (
                      <span>Sources: {currentSlide.sources.join(' | ')}</span>
                    )}
                  </div>
                  <span className="slide-counter">
                    {currentIdx + 1} / {slides.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Slide Carousel Navigator */}
          <div className="slide-deck-nav">
            <button
              type="button"
              className="nav-btn prev"
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              title="Previous Slide (Left Arrow)"
              aria-label="Previous Slide"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="slide-thumbnails-track">
              {slides.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`slide-thumb-pill ${idx === currentIdx ? 'active' : ''}`}
                  onClick={() => setCurrentIdx(idx)}
                  title={`Slide ${idx + 1}: ${s.title}`}
                >
                  <span className="thumb-num">{idx + 1}</span>
                  <span className="thumb-title">{s.title}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="nav-btn next"
              onClick={() => setCurrentIdx((i) => Math.min(slides.length - 1, i + 1))}
              disabled={currentIdx === slides.length - 1}
              title="Next Slide (Right Arrow)"
              aria-label="Next Slide"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
