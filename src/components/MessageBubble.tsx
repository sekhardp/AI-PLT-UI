import { Bot, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { Message } from '../types';

interface MessageBubbleProps {
  msg: Message;
  onFeedback: (msgId: string, rating: 1 | -1) => void;
}

export function MessageBubble({ msg, onFeedback }: MessageBubbleProps) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Render simple markdown (bold, italic, blockquote)
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('> ')) {
        return <blockquote key={i}>{line.slice(2)}</blockquote>;
      }
      const formatted = line
        .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
        .map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={j}>{part.slice(1, -1)}</em>;
          }
          return part;
        });
      return <span key={i}>{formatted}{i < lines.length - 1 && <br />}</span>;
    });
  };

  return (
    <div className={`message-row ${isUser ? 'user' : ''}`} role="article" aria-label={`${msg.role} message`}>
      <div className={`message-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`} aria-hidden="true">
        {isUser ? 'U' : <Bot size={14} />}
      </div>
      <div className="message-content">
        <div className={`message-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
          {renderContent(msg.content)}
          {msg.isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
        </div>
        <div className="message-meta">
          <span className="message-time">{time}</span>
          {!isUser && !msg.isStreaming && (
            <div className="feedback-row" role="group" aria-label="Message feedback">
              <button
                className={`feedback-btn ${msg.feedback === 1 ? 'active-up' : ''}`}
                onClick={() => onFeedback(msg.id, 1)}
                aria-label="Thumbs up"
                id={`btn-feedback-up-${msg.id.slice(0, 8)}`}
              >
                <ThumbsUp size={13} />
              </button>
              <button
                className={`feedback-btn ${msg.feedback === -1 ? 'active-down' : ''}`}
                onClick={() => onFeedback(msg.id, -1)}
                aria-label="Thumbs down"
                id={`btn-feedback-down-${msg.id.slice(0, 8)}`}
              >
                <ThumbsDown size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
