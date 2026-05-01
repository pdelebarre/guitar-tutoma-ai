import { useState, useRef } from 'react';
import { createTutorial, uploadTutorialFiles, isAuthenticated } from '../services/api';
import './AddTutorialModal.css';

interface AddTutorialModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTutorialModal({ onClose, onSuccess }: AddTutorialModalProps) {
  const [step, setStep] = useState<'create' | 'upload' | 'done'>('create');
  const [tutorialId, setTutorialId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Check authentication
  if (!isAuthenticated()) {
    return (
      <div className="add-tutorial-overlay" onClick={onClose}>
        <div className="add-tutorial-modal" onClick={(e) => e.stopPropagation()}>
          <div className="add-tutorial-modal__header">
            <h3>Add Tutorial</h3>
            <button className="add-tutorial-modal__close" onClick={onClose} aria-label="Close">&times;</button>
          </div>
          <div className="add-tutorial-modal__body">
            <p>You need to be signed in to add tutorials.</p>
            <div className="add-tutorial-modal__actions">
              <button className="btn btn--secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const id = tutorialId.trim().toLowerCase().replace(/\s+/g, '-');
    if (!id) {
      setError('Tutorial ID is required');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      setError('Tutorial ID can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    setLoading(true);
    try {
      await createTutorial(id, displayName.trim() || undefined);
      setTutorialId(id);
      setSuccessMsg(`Tutorial "${displayName.trim() || id}" created!`);
      setStep('upload');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create tutorial');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!videoFile && !pdfFile) {
      setError('Please select at least a video or PDF file');
      return;
    }

    setLoading(true);
    try {
      const result = await uploadTutorialFiles(tutorialId, videoFile || undefined, pdfFile || undefined);
      setSuccessMsg(result.message);
      setStep('done');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to upload files');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDone() {
    onSuccess();
    onClose();
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  }

  return (
    <div className="add-tutorial-overlay" onClick={handleOverlayClick}>
      <div className="add-tutorial-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-tutorial-modal__header">
          <h3>Add Tutorial</h3>
          {!loading && (
            <button className="add-tutorial-modal__close" onClick={onClose} aria-label="Close">&times;</button>
          )}
        </div>

        <div className="add-tutorial-modal__body">
          {step === 'create' && (
            <form onSubmit={handleCreate}>
              <div className="add-tutorial-modal__field">
                <label htmlFor="tutorial-id">Tutorial ID *</label>
                <input
                  id="tutorial-id"
                  type="text"
                  value={tutorialId}
                  onChange={(e) => setTutorialId(e.target.value)}
                  placeholder="e.g., my-new-lesson"
                  required
                  disabled={loading}
                />
                <p className="add-tutorial-modal__field-hint">
                  Used as the directory name. Use hyphens for spaces (e.g., "beginner-chords")
                </p>
              </div>

              <div className="add-tutorial-modal__field">
                <label htmlFor="tutorial-display-name">Display Name (optional)</label>
                <input
                  id="tutorial-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Beginner Chords"
                  disabled={loading}
                />
              </div>

              {error && <div className="add-tutorial-modal__error">⚠️ {error}</div>}

              <div className="add-tutorial-modal__actions">
                <button type="button" className="btn btn--secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={loading}>
                  {loading ? 'Creating…' : 'Create & Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 'upload' && (
            <form onSubmit={handleUpload}>
              {successMsg && <div className="add-tutorial-modal__success">✅ {successMsg}</div>}

              <div className="add-tutorial-modal__field">
                <label htmlFor="tutorial-video">Video File (mp4, mkv, webm, avi, mov)</label>
                <input
                  ref={videoInputRef}
                  id="tutorial-video"
                  type="file"
                  accept=".mp4,.mkv,.webm,.avi,.mov,video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              <div className="add-tutorial-modal__field">
                <label htmlFor="tutorial-pdf">PDF File (tablature, lesson notes)</label>
                <input
                  ref={pdfInputRef}
                  id="tutorial-pdf"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>

              {error && <div className="add-tutorial-modal__error">⚠️ {error}</div>}

              <div className="add-tutorial-modal__actions">
                <button type="button" className="btn btn--secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={loading}>
                  {loading ? 'Uploading…' : 'Upload Files'}
                </button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <>
              {successMsg && <div className="add-tutorial-modal__success">✅ {successMsg}</div>}
              <p>Tutorial "{displayName || tutorialId}" has been created and files uploaded.</p>
              <p>You can now view it in the library and upload a PDF for metadata extraction.</p>
              <div className="add-tutorial-modal__actions">
                <button className="btn btn--primary" onClick={handleDone}>
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
