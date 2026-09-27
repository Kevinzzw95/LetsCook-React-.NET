import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
    src: string;
    title: string;
    index: number;
    count: number;
    onSelect: (index: number) => void;
    onClose: () => void;
}

const ImageLightbox = ({ src, title, index, count, onSelect, onClose }: Props) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const [zoomed, setZoomed] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        const previousOverflow = document.body.style.overflow;
        if (dialog && !dialog.open) dialog.showModal();
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        setZoomed(false);
        viewportRef.current?.scrollTo(0, 0);
    }, [src]);

    return (
        <dialog
            ref={dialogRef}
            className="recipe-image-lightbox"
            aria-labelledby={titleId}
            onClose={onClose}
            onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                if (event.clientX < bounds.left || event.clientX > bounds.right ||
                    event.clientY < bounds.top || event.clientY > bounds.bottom) dialogRef.current?.close();
            }}
            onKeyDown={(event) => {
                if (zoomed) return;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    onSelect(Math.max(0, Math.min(count - 1, index + (event.key === 'ArrowRight' ? 1 : -1))));
                }
            }}
        >
            <header className="recipe-image-lightbox__toolbar">
                <h2 id={titleId}>{title || 'Recipe photo'}</h2>
                <span aria-live="polite">{index + 1} / {count}</span>
                <button type="button" onClick={() => setZoomed((value) => !value)}
                    aria-label={zoomed ? 'Zoom out' : 'Zoom in'} aria-pressed={zoomed}>
                    {zoomed ? <ZoomOut size={22} /> : <ZoomIn size={22} />}
                </button>
                <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close image view" autoFocus>
                    <X size={24} />
                </button>
            </header>
            <div ref={viewportRef} className="recipe-image-lightbox__viewport" tabIndex={0}
                role="region" aria-label="Enlarged image; scroll to explore when zoomed">
                <button type="button" className={`recipe-image-lightbox__image ${zoomed ? 'is-zoomed' : ''}`}
                    onClick={() => setZoomed((value) => !value)} aria-label={zoomed ? 'Zoom out of image' : 'Zoom into image'}>
                    <img src={src} alt={`${title} — photo ${index + 1}`} draggable={false} />
                </button>
            </div>
            {count > 1 && (
                <footer className="recipe-image-lightbox__navigation">
                    <button type="button" onClick={() => onSelect(index - 1)} disabled={index === 0} aria-label="Previous image">
                        <ChevronLeft size={22} />
                    </button>
                    <span>Use arrow keys to browse. Click the image to zoom.</span>
                    <button type="button" onClick={() => onSelect(index + 1)} disabled={index === count - 1} aria-label="Next image">
                        <ChevronRight size={22} />
                    </button>
                </footer>
            )}
        </dialog>
    );
};

export default ImageLightbox;
