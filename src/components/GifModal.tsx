import React, { useState, useEffect } from 'react';
import './GifModal.css';

export const GifModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mediaSrc, setMediaSrc] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  useEffect(() => {
    // Make openGifModal available globally
    (window as any).openGifModal = (src: string, title: string, type: 'image' | 'video' = 'image') => {
      setMediaSrc(src);
      setMediaTitle(title);
      setMediaType(type);
      setIsOpen(true);
      document.body.style.overflow = 'hidden';
    };

    return () => {
      delete (window as any).openGifModal;
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const closeModal = () => {
    setIsOpen(false);
    document.body.style.overflow = 'unset';
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="gif-modal-backdrop" onClick={handleBackdropClick}>
      <div className="gif-modal-content">
        <button className="gif-modal-close" onClick={closeModal} aria-label="Close modal">
          ✕
        </button>
        {mediaTitle && <h2 className="gif-modal-title">{mediaTitle}</h2>}
        {mediaType === 'video' ? (
          <video autoPlay loop muted className="gif-modal-image">
            <source src={mediaSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <img src={mediaSrc} alt={mediaTitle} className="gif-modal-image" />
        )}
      </div>
    </div>
  );
};

export default GifModal;
