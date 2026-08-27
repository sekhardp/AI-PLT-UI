import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload as UploadIcon, 
  FileText, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { fetchDocuments, uploadDocument, deleteDocument, type UserDocument, type QuotaInfo } from '../api';
import { useAuth } from '../context/AuthContext';

interface DocumentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentsUpdated?: () => void;
}

export function DocumentManagerModal({ isOpen, onClose, onDocumentsUpdated }: DocumentManagerModalProps) {
  const { user } = useAuth();
  const effectiveUserId = user?.email || "default_user";
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDocuments(effectiveUserId);
      setDocuments(data.documents || []);
      setQuota(data.quota || null);
      if (onDocumentsUpdated) {
        onDocumentsUpdated();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setError(null);
    setUploading(true);

    for (const file of fileList) {
      try {
        await uploadDocument(file, effectiveUserId);
      } catch (err: any) {
        setError(err.message || `Failed to upload ${file.name}`);
        break;
      }
    }

    await loadDocuments();
    setUploading(false);
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}" and its vector embeddings?`)) {
      return;
    }
    try {
      setError(null);
      await deleteDocument(docId, effectiveUserId);
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || `Failed to delete ${filename}`);
    }
  };

  const pctStorage = quota ? Math.min(100, Math.round((quota.total_mb / quota.max_mb) * 100)) : 0;
  const isDocLimitReached = quota ? quota.total_documents >= quota.max_documents : false;

  return (
    <div className="panel-overlay" role="dialog" aria-modal="true" aria-label="Knowledge Base & Documents">
      <div className="panel" style={{ maxWidth: '640px', width: '92%' }}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={20} color="var(--accent)" />
            <h2 className="panel-title">Knowledge Base & Documents</h2>
          </div>
          <button className="panel-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Quota Indicators */}
        {quota && (
          <div style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--r-md)',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-primary-dark)', fontWeight: 600 }}>
              <span>Storage Quota: {quota.total_mb} MB / {quota.max_mb} MB</span>
              <span>Documents: {quota.total_documents} / {quota.max_documents}</span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(0,0,0,0.06)',
              borderRadius: 'var(--r-full)',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${pctStorage}%`,
                height: '100%',
                background: pctStorage > 90 ? 'var(--danger)' : 'var(--accent)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* Error Alert with Retry */}
        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            borderRadius: 'var(--r-md)',
            color: 'var(--danger)',
            fontSize: '0.82rem',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button
              onClick={loadDocuments}
              style={{
                background: 'none',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '2px 8px',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Drag & Drop Zone */}
        {!isDocLimitReached ? (
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFileSelect(e.dataTransfer.files);
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{
              cursor: uploading ? 'wait' : 'pointer',
              marginBottom: '16px',
              padding: '24px 16px',
              textAlign: 'center'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.json,.csv"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />
            <div className="drop-zone-icon" style={{ marginBottom: '8px' }}>
              {uploading ? <Loader2 size={28} className="btn-spinner" /> : <UploadIcon size={28} />}
            </div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary-dark)' }}>
              {uploading ? 'Vectorizing and Indexing into Cloud SQL...' : 'Click to Upload or Drag & Drop'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              PDF, DOCX, TXT, Markdown · Max 100 MB per user
            </p>
          </div>
        ) : (
          <div style={{
            padding: '12px',
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: 'var(--r-md)',
            fontSize: '0.82rem',
            color: 'var(--warning)',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            Maximum limit of 5 documents reached. Delete existing documents to upload new ones.
          </div>
        )}

        {/* Document List */}
        <div style={{ marginTop: '8px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary-dark)', marginBottom: '10px' }}>
            Your Indexed Documents ({documents.length})
          </h4>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
              <Loader2 size={20} className="btn-spinner" />
            </div>
          ) : documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No documents uploaded yet. Upload documents to query them via RAG in chat!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {documents.map((doc: UserDocument) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--glass)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--r-md)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <FileText size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-primary-dark)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {doc.filename}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {doc.file_size_mb} MB · {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {doc.status === 'ready' ? (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: 'var(--r-full)',
                        background: 'rgba(34, 197, 94, 0.12)',
                        color: '#16a34a',
                        fontWeight: 600
                      }}>
                        <CheckCircle size={11} /> Ready
                      </span>
                    ) : doc.status === 'indexing' ? (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: 'var(--r-full)',
                        background: 'rgba(234, 179, 8, 0.12)',
                        color: '#ca8a04',
                        fontWeight: 600
                      }}>
                        <Loader2 size={11} className="btn-spinner" /> Indexing
                      </span>
                    ) : (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: 'var(--r-full)',
                        background: 'rgba(220, 38, 38, 0.12)',
                        color: '#dc2626',
                        fontWeight: 600
                      }}>
                        <AlertCircle size={11} /> Failed
                      </span>
                    )}

                    <button
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: 'var(--r-sm)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Delete document"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
