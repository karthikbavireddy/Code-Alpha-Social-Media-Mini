import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Check,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  ZoomIn,
  Crop as CropIcon,
  Sparkles,
  Move,
  SlidersHorizontal
} from 'lucide-react';

const FILTERS = [
  { id: 'normal', name: 'Normal', css: 'none' },
  { id: 'vivid', name: 'Vivid', css: 'contrast(125%) saturate(135%)' },
  { id: 'warm', name: 'Warm', css: 'sepia(30%) saturate(120%) brightness(105%)' },
  { id: 'dramatic', name: 'B&W', css: 'grayscale(100%) contrast(140%)' },
  { id: 'cool', name: 'Cool', css: 'hue-rotate(180deg) saturate(110%)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(50%) contrast(90%) brightness(95%)' },
];

const ASPECT_RATIOS = [
  { label: 'Free', value: null },
  { label: '1:1 Square', value: 1 },
  { label: '4:5 Portrait', value: 4 / 5 },
  { label: '16:9 Wide', value: 16 / 9 },
  { label: '4:3 Standard', value: 4 / 3 },
];

export default function ImageCropModal({ isOpen, onClose, imageSrc, onCropComplete }) {
  const [activeTab, setActiveTab] = useState('crop'); // 'crop' | 'transform' | 'filters'
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [aspectRatio, setAspectRatio] = useState(null);

  // Crop box in percentages (0 to 100)
  const [cropBox, setCropBox] = useState({ x: 5, y: 5, width: 90, height: 90 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState(null); // 'move', 'nw', 'se'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('crop');
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setSelectedFilter('normal');
      setAspectRatio(null);
      setCropBox({ x: 5, y: 5, width: 90, height: 90 });
    }
  }, [isOpen, imageSrc]);

  // Adjust crop box when aspect ratio changes
  useEffect(() => {
    if (!aspectRatio) return;
    setCropBox((prev) => {
      let newW = prev.width;
      let newH = newW / aspectRatio;
      if (newH > 90) {
        newH = 80;
        newW = newH * aspectRatio;
      }
      return {
        ...prev,
        width: Math.min(90, Math.max(20, newW)),
        height: Math.min(90, Math.max(20, newH)),
      };
    });
  }, [aspectRatio]);

  if (!isOpen || !imageSrc) return null;

  const handlePointerDown = (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragAction(action);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      cropX: cropBox.x,
      cropY: cropBox.y,
      cropW: cropBox.width,
      cropH: cropBox.height,
    });
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    setCropBox((prev) => {
      let { x, y, width, height } = prev;

      if (dragAction === 'move') {
        x = Math.max(0, Math.min(100 - width, dragStart.cropX + deltaX));
        y = Math.max(0, Math.min(100 - height, dragStart.cropY + deltaY));
      } else if (dragAction === 'se') {
        width = Math.max(15, Math.min(100 - dragStart.cropX, dragStart.cropW + deltaX));
        height = aspectRatio ? width / aspectRatio : Math.max(15, Math.min(100 - dragStart.cropY, dragStart.cropH + deltaY));
      } else if (dragAction === 'nw') {
        const newW = Math.max(15, dragStart.cropW - deltaX);
        const newH = aspectRatio ? newW / aspectRatio : Math.max(15, dragStart.cropH - deltaY);
        x = Math.max(0, dragStart.cropX + (dragStart.cropW - newW));
        y = Math.max(0, dragStart.cropY + (dragStart.cropH - newH));
        width = newW;
        height = newH;
      }

      return { x, y, width, height };
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragAction(null);
  };

  const handleApply = async () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d');

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    const cropPixelX = (cropBox.x / 100) * naturalW;
    const cropPixelY = (cropBox.y / 100) * naturalH;
    const cropPixelW = (cropBox.width / 100) * naturalW;
    const cropPixelH = (cropBox.height / 100) * naturalH;

    offscreenCanvas.width = cropPixelW;
    offscreenCanvas.height = cropPixelH;

    ctx.save();
    const filterObj = FILTERS.find((f) => f.id === selectedFilter);
    if (filterObj && filterObj.css !== 'none') {
      ctx.filter = filterObj.css;
    }

    ctx.drawImage(
      img,
      cropPixelX,
      cropPixelY,
      cropPixelW,
      cropPixelH,
      0,
      0,
      cropPixelW,
      cropPixelH
    );
    ctx.restore();

    if (rotation !== 0 || flipH) {
      const transformCanvas = document.createElement('canvas');
      const tCtx = transformCanvas.getContext('2d');

      const isRotated90or270 = rotation === 90 || rotation === 270;
      transformCanvas.width = isRotated90or270 ? cropPixelH : cropPixelW;
      transformCanvas.height = isRotated90or270 ? cropPixelW : cropPixelH;

      tCtx.translate(transformCanvas.width / 2, transformCanvas.height / 2);
      tCtx.rotate((rotation * Math.PI) / 180);
      tCtx.scale(flipH ? -1 : 1, 1);
      tCtx.drawImage(
        offscreenCanvas,
        -cropPixelW / 2,
        -cropPixelH / 2,
        cropPixelW,
        cropPixelH
      );

      transformCanvas.toBlob((blob) => {
        if (blob) {
          const editedFile = new File([blob], 'edited_photo.jpg', { type: 'image/jpeg' });
          const previewUrl = URL.createObjectURL(blob);
          onCropComplete(editedFile, previewUrl);
          onClose();
        }
      }, 'image/jpeg', 0.95);
    } else {
      offscreenCanvas.toBlob((blob) => {
        if (blob) {
          const editedFile = new File([blob], 'edited_photo.jpg', { type: 'image/jpeg' });
          const previewUrl = URL.createObjectURL(blob);
          onCropComplete(editedFile, previewUrl);
          onClose();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const currentFilter = FILTERS.find((f) => f.id === selectedFilter)?.css || 'none';

  return (
    <div
      className="modal-backdrop"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ zIndex: 1100, padding: '12px' }}
    >
      <div
        className="modal-container"
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glow)',
        }}
      >
        {/* Header (Fixed) */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(18, 20, 32, 0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CropIcon size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>
              Crop & Edit Photo
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Canvas & Interactive Viewport (Flexible) */}
        <div
          style={{
            flex: '1 1 auto',
            minHeight: '200px',
            maxHeight: '44vh',
            background: '#06070a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            userSelect: 'none',
            padding: '10px',
            position: 'relative',
          }}
        >
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              display: 'inline-block',
              maxWidth: '100%',
              maxHeight: '40vh',
              overflow: 'hidden',
            }}
          >
            {/* The Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              crossOrigin="anonymous"
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '40vh',
                objectFit: 'contain',
                transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scale(${zoom})`,
                filter: currentFilter,
                transition: isDragging ? 'none' : 'transform 200ms ease, filter 200ms ease',
                pointerEvents: 'none',
              }}
            />

            {/* Dark Mask outside Crop Box */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.55)',
                pointerEvents: 'none',
              }}
            />

            {/* Interactive Crop Box Window */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              style={{
                position: 'absolute',
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
                border: '2px solid #6366f1',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                cursor: 'move',
                boxSizing: 'border-box',
              }}
            >
              {/* Grid Lines */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gridTemplateRows: '1fr 1fr 1fr',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.35)', borderBottom: '1px dashed rgba(255, 255, 255, 0.35)' }} />
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.35)', borderBottom: '1px dashed rgba(255, 255, 255, 0.35)' }} />
                <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.35)' }} />
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.35)', borderBottom: '1px dashed rgba(255, 255, 255, 0.35)' }} />
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.35)', borderBottom: '1px dashed rgba(255, 255, 255, 0.35)' }} />
                <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.35)' }} />
              </div>

              {/* Corner Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'nw')}
                style={{
                  position: 'absolute',
                  top: '-6px',
                  left: '-6px',
                  width: '14px',
                  height: '14px',
                  background: '#6366f1',
                  border: '2px solid #fff',
                  borderRadius: '2px',
                  cursor: 'nwse-resize',
                }}
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'se')}
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  width: '14px',
                  height: '14px',
                  background: '#6366f1',
                  border: '2px solid #fff',
                  borderRadius: '2px',
                  cursor: 'nwse-resize',
                }}
              />
            </div>
          </div>
        </div>

        {/* Tab Selection Bar (Compact) */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(14, 16, 26, 0.95)',
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('crop')}
            className={`btn btn-sm ${activeTab === 'crop' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '5px 14px', fontSize: '0.8rem', gap: '6px' }}
          >
            <CropIcon size={14} /> Aspect Ratio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transform')}
            className={`btn btn-sm ${activeTab === 'transform' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '5px 14px', fontSize: '0.8rem', gap: '6px' }}
          >
            <SlidersHorizontal size={14} /> Rotate & Zoom
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('filters')}
            className={`btn btn-sm ${activeTab === 'filters' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '5px 14px', fontSize: '0.8rem', gap: '6px' }}
          >
            <Sparkles size={14} /> Filters
          </button>
        </div>

        {/* Tab Controls Panel (Guaranteed Height, No Stacking) */}
        <div
          style={{
            flexShrink: 0,
            padding: '12px 16px',
            background: 'var(--bg-surface)',
            minHeight: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Sub-Panel 1: Aspect Ratio Presets */}
          {activeTab === 'crop' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {ASPECT_RATIOS.map((r) => {
                const isSelected = aspectRatio === r.value;
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => setAspectRatio(r.value)}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sub-Panel 2: Transformations */}
          {activeTab === 'transform' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  title="Rotate 90° Left"
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                >
                  <RotateCcw size={14} /> 90°
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate 90° Right"
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                >
                  <RotateCw size={14} /> 90°
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${flipH ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFlipH(!flipH)}
                  title="Flip Horizontal"
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                >
                  <FlipHorizontal size={14} /> Flip
                </button>
              </div>

              {/* Zoom Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
                <ZoomIn size={15} color="var(--text-muted)" />
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  style={{
                    accentColor: 'var(--primary)',
                    cursor: 'pointer',
                    width: '120px',
                  }}
                />
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {zoom.toFixed(1)}x
                </span>
              </div>
            </div>
          )}

          {/* Sub-Panel 3: Filters */}
          {activeTab === 'filters' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {FILTERS.map((f) => {
                const isSelected = selectedFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFilter(f.id)}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions (Fixed at bottom, never clipped) */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
          }}
        >
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '8px 16px' }}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleApply} style={{ padding: '8px 18px', gap: '6px' }}>
            <Check size={16} /> Apply & Use Photo
          </button>
        </div>
      </div>
    </div>
  );
}
