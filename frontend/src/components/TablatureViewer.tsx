import { useEffect, useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import {
  getTablatureUrl,
  getAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
} from '../services/api';
import type { Annotation, StrokePoint } from '../types';
import './TablatureViewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

type DrawingTool = 'text' | 'underline' | 'highlight' | 'drawing';

interface TablatureViewerProps {
  tutorialId: string;
  hasTablature: boolean;
}

export default function TablatureViewer({
  tutorialId,
  hasTablature,
}: TablatureViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawingTool>('text');
  const [activeColor, setActiveColor] = useState('#FFD700');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
  const [textInput, setTextInput] = useState<{
    visible: boolean;
    x: number;
    y: number;
    pageNumber: number;
  }>({ visible: false, x: 0, y: 0, pageNumber: 0 });
  const textInputRef = useRef<HTMLInputElement>(null);
  const overlayRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const drawingPageRef = useRef<number | null>(null);

  const fetchAnnotations = useCallback(async () => {
    try {
      const data = await getAnnotations(tutorialId);
      setAnnotations(data);
    } catch {
      // Annotations may not exist yet; that's fine
    }
  }, [tutorialId]);

  useEffect(() => {
    if (hasTablature) {
      fetchAnnotations();
    }
  }, [hasTablature, fetchAnnotations]);

  function onDocumentLoadSuccess({ numPages: pages }: { numPages: number }) {
    setNumPages(pages);
    setLoadError(null);
  }

  function onDocumentLoadError() {
    setLoadError('Failed to load tablature PDF.');
  }

  // ── Drawing handlers ──────────────────────────────────────

  function getRelativePosition(
    e: React.MouseEvent<HTMLDivElement>,
    pageNumber: number
  ): StrokePoint | null {
    const overlay = overlayRefs.current.get(pageNumber);
    if (!overlay) return null;
    const rect = overlay.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  function handleMouseDown(
    e: React.MouseEvent<HTMLDivElement>,
    pageNumber: number
  ) {
    if (activeTool === 'text') {
      handleOverlayClick(e, pageNumber);
      return;
    }

    const point = getRelativePosition(e, pageNumber);
    if (!point) return;

    setIsDrawing(true);
    drawingPageRef.current = pageNumber;
    setCurrentStroke([point]);
  }

  function handleMouseMove(
    e: React.MouseEvent<HTMLDivElement>,
    pageNumber: number
  ) {
    if (!isDrawing || drawingPageRef.current !== pageNumber) return;

    const point = getRelativePosition(e, pageNumber);
    if (!point) return;

    setCurrentStroke((prev) => [...prev, point]);
  }

  async function handleMouseUp(
    _e: React.MouseEvent<HTMLDivElement>,
    pageNumber: number
  ) {
    if (!isDrawing || drawingPageRef.current !== pageNumber) return;
    setIsDrawing(false);
    drawingPageRef.current = null;

    const stroke = currentStroke;
    setCurrentStroke([]);

    if (stroke.length < 2) return;

    // Calculate bounding box from stroke points
    const xs = stroke.map((p) => p.x);
    const ys = stroke.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    try {
      const newAnnotation = await createAnnotation(tutorialId, {
        pageNumber,
        x: minX,
        y: minY,
        width: maxX - minX || 1,
        height: maxY - minY || 1,
        content: '',
        type: activeTool,
        strokeData: JSON.stringify(stroke),
        color: activeColor,
      });
      setAnnotations((prev) => [...prev, newAnnotation]);
    } catch {
      // Silently fail; user can retry
    }
  }

  // ── Text annotation handler ────────────────────────────────

  function handleOverlayClick(
    e: React.MouseEvent<HTMLDivElement>,
    pageNumber: number
  ) {
    // Don't create annotation if clicking on an existing annotation
    if ((e.target as HTMLElement).closest('.tablature-viewer__annotation') ||
        (e.target as HTMLElement).closest('.tablature-viewer__drawing')) {
      return;
    }

    const overlay = overlayRefs.current.get(pageNumber);
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Show controlled text input instead of window.prompt()
    setTextInput({ visible: true, x, y, pageNumber });
    // Focus the input on next render
    setTimeout(() => textInputRef.current?.focus(), 0);
  }

  async function handleTextInputSubmit() {
    const inputEl = textInputRef.current;
    if (!inputEl) return;

    const content = inputEl.value.trim();
    if (!content) {
      setTextInput({ visible: false, x: 0, y: 0, pageNumber: 0 });
      return;
    }

    const { x, y, pageNumber } = textInput;

    try {
      const newAnnotation = await createAnnotation(tutorialId, {
        pageNumber,
        x,
        y,
        width: 15,
        height: 5,
        content,
        type: 'text',
        strokeData: null,
        color: null,
      });
      setAnnotations((prev) => [...prev, newAnnotation]);
    } catch {
      // Silently fail; user can retry
    }

    setTextInput({ visible: false, x: 0, y: 0, pageNumber: 0 });
  }

  function handleTextInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTextInputSubmit();
    }
    if (e.key === 'Escape') {
      setTextInput({ visible: false, x: 0, y: 0, pageNumber: 0 });
    }
  }

  // ── Text annotation edit handlers ──────────────────────────

  function handleAnnotationClick(annotation: Annotation) {
    if (annotation.type !== 'text') return;
    setEditingId(annotation.id);
    setEditText(annotation.content);
  }

  async function handleEditSave(annotation: Annotation) {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const updated = await updateAnnotation(tutorialId, annotation.id, {
        pageNumber: annotation.pageNumber,
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
        content: editText.trim(),
        type: annotation.type,
        strokeData: annotation.strokeData,
        color: annotation.color,
      });
      setAnnotations((prev) =>
        prev.map((a) => (a.id === annotation.id ? updated : a))
      );
    } catch {
      // Silently fail; user can retry
    }
    setEditingId(null);
  }

  function handleEditKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    annotation: Annotation
  ) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave(annotation);
    }
    if (e.key === 'Escape') {
      setEditingId(null);
    }
  }

  async function handleDelete(annotationId: number) {
    try {
      await deleteAnnotation(tutorialId, annotationId);
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
    } catch {
      // Silently fail; user can retry
    }
  }

  // ── Download annotated PDF ─────────────────────────────────

  async function handleDownloadAnnotatedPdf() {
    setDownloading(true);
    try {
      const response = await fetch(getTablatureUrl(tutorialId));
      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 10;

      const pages = pdfDoc.getPages();

      for (const annotation of annotations) {
        const pageIndex = annotation.pageNumber - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;

        const page = pages[pageIndex];
        const { width: pageWidth, height: pageHeight } = page.getSize();

        if (annotation.type === 'text' && annotation.content) {
          // Convert percentage-based coordinates to absolute coordinates
          const absX = (annotation.x / 100) * pageWidth;
          const absY = pageHeight - (annotation.y / 100) * pageHeight;

          const text = annotation.content;
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = fontSize;
          const padding = 4;

          page.drawRectangle({
            x: absX - padding,
            y: absY - textHeight - padding,
            width: textWidth + padding * 2,
            height: textHeight + padding * 2,
            color: rgb(1, 0.86, 0.39),
            opacity: 0.35,
            borderColor: rgb(1, 0.71, 0),
            borderWidth: 1,
            borderOpacity: 0.7,
          });

          page.drawText(text, {
            x: absX,
            y: absY - textHeight,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
        } else if (annotation.strokeData) {
          const strokePoints: StrokePoint[] = JSON.parse(annotation.strokeData);
          if (strokePoints.length < 2) continue;

          const color = annotation.color || '#FFD700';
          const hex = color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;

          const absPoints = strokePoints.map((p) => ({
            x: (p.x / 100) * pageWidth,
            y: pageHeight - (p.y / 100) * pageHeight,
          }));

          if (annotation.type === 'highlight') {
            // Draw a semi-transparent highlight path
            for (let i = 0; i < absPoints.length - 1; i++) {
              const p1 = absPoints[i];
              const p2 = absPoints[i + 1];
              const thickness = 8;
              page.drawRectangle({
                x: Math.min(p1.x, p2.x),
                y: Math.min(p1.y, p2.y) - thickness / 2,
                width: Math.abs(p2.x - p1.x) || 2,
                height: thickness,
                color: rgb(r, g, b),
                opacity: 0.3,
              });
            }
          } else {
            // Underline or drawing: draw lines
            for (let i = 0; i < absPoints.length - 1; i++) {
              const p1 = absPoints[i];
              const p2 = absPoints[i + 1];
              const thickness = annotation.type === 'underline' ? 3 : 2;
              page.drawLine({
                start: p1,
                end: p2,
                thickness,
                color: rgb(r, g, b),
                opacity: annotation.type === 'underline' ? 0.8 : 0.9,
              });
            }
          }
        }
      }

      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([modifiedPdfBytes as BlobPart], { type: 'application/pdf' });
      saveAs(blob, `${tutorialId}-annotated.pdf`);
    } catch {
      // Download failed; user can retry
    } finally {
      setDownloading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────

  if (!hasTablature) {
    return (
      <div className="tablature-viewer">
        <div className="tablature-viewer__no-tablature">
          No tablature available
        </div>
      </div>
    );
  }

  const fileUrl = getTablatureUrl(tutorialId);

  const colors = ['#FFD700', '#FF6B6B', '#4FC3F7', '#81C784', '#FF8A65', '#CE93D8'];

  return (
    <div className="tablature-viewer">
      {/* Drawing Toolbar */}
      <div className="tablature-viewer__toolbar">
        <div className="tablature-viewer__tools">
          <button
            className={`tablature-viewer__tool-btn${activeTool === 'text' ? ' tablature-viewer__tool-btn--active' : ''}`}
            onClick={() => setActiveTool('text')}
            title="Text annotation"
            aria-label="Text annotation tool"
          >
            💬 Text
          </button>
          <button
            className={`tablature-viewer__tool-btn${activeTool === 'underline' ? ' tablature-viewer__tool-btn--active' : ''}`}
            onClick={() => setActiveTool('underline')}
            title="Underline"
            aria-label="Underline tool"
          >
            ═ Underline
          </button>
          <button
            className={`tablature-viewer__tool-btn${activeTool === 'highlight' ? ' tablature-viewer__tool-btn--active' : ''}`}
            onClick={() => setActiveTool('highlight')}
            title="Highlight"
            aria-label="Highlight tool"
          >
            🖍 Highlight
          </button>
          <button
            className={`tablature-viewer__tool-btn${activeTool === 'drawing' ? ' tablature-viewer__tool-btn--active' : ''}`}
            onClick={() => setActiveTool('drawing')}
            title="Freehand drawing"
            aria-label="Freehand drawing tool"
          >
            ✏️ Draw
          </button>
        </div>
        <div className="tablature-viewer__color-picker">
          {colors.map((c) => (
            <button
              key={c}
              className={`tablature-viewer__color-btn${activeColor === c ? ' tablature-viewer__color-btn--active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setActiveColor(c)}
              aria-label={`Color ${c}`}
              title={`Color ${c}`}
            />
          ))}
        </div>
        <div className="tablature-viewer__actions">
          {annotations.length > 0 && (
            <button
              className="tablature-viewer__download-btn"
              onClick={handleDownloadAnnotatedPdf}
              disabled={downloading}
              aria-label="Download annotated PDF"
            >
              {downloading ? 'Downloading…' : '⬇ Download PDF'}
            </button>
          )}
        </div>
      </div>

      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="tablature-viewer__loading" role="status">
            Loading tablature…
          </div>
        }
      >
        {loadError && (
          <div className="tablature-viewer__error" role="alert">
            {loadError}
          </div>
        )}
        {numPages > 0 && (
          <div className="tablature-viewer__page-wrapper">
            {(() => {
              const pageNumber = currentPage;
              const pageAnnotations = annotations.filter(
                (a) => a.pageNumber === pageNumber
              );

              return (
                <div key={pageNumber} className="tablature-viewer__page-container">
                  <Page
                    pageNumber={pageNumber}
                    width={undefined}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                  <div
                    className={`tablature-viewer__overlay${activeTool !== 'text' ? ' tablature-viewer__overlay--drawing' : ''}`}
                    ref={(el) => {
                      if (el) {
                        overlayRefs.current.set(pageNumber, el);
                      } else {
                        overlayRefs.current.delete(pageNumber);
                      }
                    }}
                    onMouseDown={(e) => handleMouseDown(e, pageNumber)}
                    onMouseMove={(e) => handleMouseMove(e, pageNumber)}
                    onMouseUp={(e) => handleMouseUp(e, pageNumber)}
                    onMouseLeave={(e) => {
                      if (isDrawing && drawingPageRef.current === pageNumber) {
                        handleMouseUp(e, pageNumber);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Annotation overlay for page ${pageNumber}`}
                  >
                    {/* Render existing drawing annotations */}
                    {pageAnnotations
                      .filter((a) => a.type !== 'text')
                      .map((annotation) => {
                        const strokePoints: StrokePoint[] = annotation.strokeData
                          ? JSON.parse(annotation.strokeData)
                          : [];
                        return (
                          <div
                            key={annotation.id}
                            className="tablature-viewer__drawing"
                            style={{
                              left: `${annotation.x}%`,
                              top: `${annotation.y}%`,
                              width: `${annotation.width}%`,
                              height: `${annotation.height}%`,
                            }}
                          >
                            <svg
                              className="tablature-viewer__drawing-svg"
                              viewBox={`0 0 100 100`}
                              preserveAspectRatio="none"
                            >
                              {annotation.type === 'highlight' ? (
                                strokePoints.map((_, i) => {
                                  if (i === 0) return null;
                                  const p1 = strokePoints[i - 1];
                                  const p2 = strokePoints[i];
                                  const relX1 = ((p1.x - annotation.x) / annotation.width) * 100;
                                  const relY1 = ((p1.y - annotation.y) / annotation.height) * 100;
                                  const relX2 = ((p2.x - annotation.x) / annotation.width) * 100;
                                  const relY2 = ((p2.y - annotation.y) / annotation.height) * 100;
                                  return (
                                    <line
                                      key={i}
                                      x1={relX1}
                                      y1={relY1}
                                      x2={relX2}
                                      y2={relY2}
                                      stroke={annotation.color || '#FFD700'}
                                      strokeWidth="6"
                                      strokeLinecap="round"
                                      opacity="0.4"
                                    />
                                  );
                                })
                              ) : (
                                strokePoints.map((_, i) => {
                                  if (i === 0) return null;
                                  const p1 = strokePoints[i - 1];
                                  const p2 = strokePoints[i];
                                  const relX1 = ((p1.x - annotation.x) / annotation.width) * 100;
                                  const relY1 = ((p1.y - annotation.y) / annotation.height) * 100;
                                  const relX2 = ((p2.x - annotation.x) / annotation.width) * 100;
                                  const relY2 = ((p2.y - annotation.y) / annotation.height) * 100;
                                  return (
                                    <line
                                      key={i}
                                      x1={relX1}
                                      y1={relY1}
                                      x2={relX2}
                                      y2={relY2}
                                      stroke={annotation.color || '#FFD700'}
                                      strokeWidth={annotation.type === 'underline' ? '3' : '2'}
                                      strokeLinecap="round"
                                      opacity="0.85"
                                    />
                                  );
                                })
                              )}
                            </svg>
                            <button
                              className="tablature-viewer__drawing-delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(annotation.id);
                              }}
                              aria-label="Delete drawing"
                              title="Delete drawing"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}

                    {/* Render current live stroke while drawing */}
                    {isDrawing && drawingPageRef.current === pageNumber && currentStroke.length > 1 && (
                      <div
                        className="tablature-viewer__drawing tablature-viewer__drawing--live"
                        style={{
                          left: `${Math.min(...currentStroke.map(p => p.x))}%`,
                          top: `${Math.min(...currentStroke.map(p => p.y))}%`,
                          width: `${Math.max(...currentStroke.map(p => p.x)) - Math.min(...currentStroke.map(p => p.x)) || 1}%`,
                          height: `${Math.max(...currentStroke.map(p => p.y)) - Math.min(...currentStroke.map(p => p.y)) || 1}%`,
                        }}
                      >
                        <svg
                          className="tablature-viewer__drawing-svg"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                        >
                          {currentStroke.map((_, i) => {
                            if (i === 0) return null;
                            const p1 = currentStroke[i - 1];
                            const p2 = currentStroke[i];
                            const minX = Math.min(...currentStroke.map(p => p.x));
                            const minY = Math.min(...currentStroke.map(p => p.y));
                            const w = Math.max(...currentStroke.map(p => p.x)) - minX || 1;
                            const h = Math.max(...currentStroke.map(p => p.y)) - minY || 1;
                            const relX1 = ((p1.x - minX) / w) * 100;
                            const relY1 = ((p1.y - minY) / h) * 100;
                            const relX2 = ((p2.x - minX) / w) * 100;
                            const relY2 = ((p2.y - minY) / h) * 100;
                            return (
                              <line
                                key={i}
                                x1={relX1}
                                y1={relY1}
                                x2={relX2}
                                y2={relY2}
                                stroke={activeColor}
                                strokeWidth={activeTool === 'highlight' ? '6' : activeTool === 'underline' ? '3' : '2'}
                                strokeLinecap="round"
                                opacity={activeTool === 'highlight' ? '0.4' : '0.85'}
                              />
                            );
                          })}
                        </svg>
                      </div>
                    )}

                    {/* Render text input overlay for new annotations */}
                    {textInput.visible && textInput.pageNumber === pageNumber && (
                      <div
                        className="tablature-viewer__text-input-overlay"
                        style={{
                          left: `${textInput.x}%`,
                          top: `${textInput.y}%`,
                        }}
                      >
                        <input
                          ref={textInputRef}
                          className="tablature-viewer__text-input"
                          type="text"
                          placeholder="Enter annotation text..."
                          onKeyDown={handleTextInputKeyDown}
                          onBlur={handleTextInputSubmit}
                          aria-label="New annotation text"
                        />
                      </div>
                    )}

                    {/* Render existing text annotations */}
                    {pageAnnotations
                      .filter((a) => a.type === 'text')
                      .map((annotation) => (
                        <div
                          key={annotation.id}
                          className="tablature-viewer__annotation"
                          style={{
                            left: `${annotation.x}%`,
                            top: `${annotation.y}%`,
                            width: `${annotation.width}%`,
                            height: `${annotation.height}%`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnnotationClick(annotation);
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`Annotation: ${annotation.content}`}
                        >
                          {editingId === annotation.id ? (
                            <>
                              <textarea
                                className="tablature-viewer__edit-input"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => handleEditKeyDown(e, annotation)}
                                onBlur={() => handleEditSave(annotation)}
                                autoFocus
                                aria-label="Edit annotation text"
                              />
                            </>
                          ) : (
                            <>
                              <span className="tablature-viewer__annotation-content">
                                {annotation.content}
                              </span>
                              <span className="tablature-viewer__annotation-actions">
                                <button
                                  className="tablature-viewer__annotation-btn tablature-viewer__annotation-btn--delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(annotation.id);
                                  }}
                                  aria-label={`Delete annotation: ${annotation.content}`}
                                  title="Delete annotation"
                                >
                                  ✕
                                </button>
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Document>

      {/* Page Navigation */}
      {numPages > 1 && (
        <nav className="tablature-viewer__page-nav" aria-label="Page navigation">
          <button
            className="tablature-viewer__page-nav-btn"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            ‹ Prev
          </button>
          <span className="tablature-viewer__page-nav-info">
            Page {currentPage} of {numPages}
          </span>
          <button
            className="tablature-viewer__page-nav-btn"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            aria-label="Next page"
          >
            Next ›
          </button>
        </nav>
      )}
    </div>
  );
}
