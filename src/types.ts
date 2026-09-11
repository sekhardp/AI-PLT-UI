export interface AttachedDocMeta {
  id: string;
  filename: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  feedback?: 1 | -1 | null;
  routed_to?: 'local' | 'frontier' | 'ai_router' | string;
  stage?: 'ai_router' | 'executing' | string;
  model?: string;
  complexity_score?: number;
  attachedDocs?: AttachedDocMeta[];
}

export interface Session {
  session_id: string;
  message_count: number;
  last_message: string;
  created_at: string;
}

export interface Agent {
  agent_id: string;
  name: string;
  type: 'orchestrator' | 'ai-agent' | 'rag-agent';
  status: 'active' | 'idle' | 'error';
  description: string;
  capabilities: string[];
}

export interface UploadedFile {
  file: File;
  id: string;
  progress: number;
  done: boolean;
  serverFileId?: string;
}

// ─── Presentation & Slide Deck Types ──────────────────────────────────────────
export interface KPICard {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface ChartSeries {
  name: string;
  values: (number | string)[];
}

export interface ChartConfig {
  chart_type?: 'bar' | 'horizontal_bar' | 'line' | 'pie' | 'doughnut';
  title?: string;
  categories: string[];
  series: ChartSeries[];
}

export interface TableConfig {
  headers: string[];
  rows: (string | number)[][];
}

export interface Slide {
  slide_number: number;
  layout: 'title_slide' | 'kpi_grid' | 'chart_and_bullets' | 'two_column_comparison' | 'table_slide' | 'bullet_cards' | string;
  title: string;
  subtitle?: string;
  bullet_points?: string[];
  kpi_cards?: KPICard[];
  chart?: ChartConfig;
  table?: TableConfig;
  left_column_title?: string;
  left_column_bullets?: string[];
  right_column_title?: string;
  right_column_bullets?: string[];
  sources?: string[];
}

export interface SlideDeck {
  deck_title?: string;
  title?: string;
  deck_subtitle?: string;
  subtitle?: string;
  theme?: 'dark' | 'light' | 'midnight' | 'navy' | 'emerald' | string;
  author?: string;
  slides: Slide[];
  sources_summary?: string[];
}

// ─── Model Selection & Per-Model Token Analytics Types ────────────────────────
export type ModelId = 'auto' | 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'qwen-2.5-7b';

export interface ModelOption {
  id: ModelId;
  name: string;
  tier: 'auto' | 'local' | 'frontier';
  tag: string;
  description: string;
  speed: 'Ultra Fast' | 'Fast' | 'Deep Reasoning';
  modelParam: string;
}

export interface ModelTokenItem {
  model: string;
  display_name: string;
  tier: 'local' | 'frontier' | string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  message_count: number;
  percentage: number;
}

export interface TierTokenSummary {
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  message_count: number;
  percentage: number;
}

export interface TokenStatsResponse {
  total_tokens: number;
  total_queries: number;
  by_model: ModelTokenItem[];
  by_tier: {
    local: TierTokenSummary;
    frontier: TierTokenSummary;
  };
}

