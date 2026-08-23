export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  feedback?: 1 | -1 | null;
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
