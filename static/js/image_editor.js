/**
 * ConnectSphere - Interactive Image Studio (Crop, Rotate, Zoom, Filter)
 * Uses Cropper.js for smooth client-side image manipulation.
 */

let cropperInstance = null;
let activeEditorCallback = null;
let activeEditorOriginalSrc = null;
let activeFilterMode = 'normal';
let activeFlipH = false;
let activeFlipV = false;

const FILTER_STYLES = {
    normal: '',
    vivid: 'saturate(1.4) contrast(1.1) brightness(1.03)',
    warm: 'sepia(0.25) saturate(1.2) brightness(1.02) hue-rotate(-10deg)',
    cool: 'saturate(1.1) brightness(1.02) hue-rotate(15deg)',
    bw: 'grayscale(1) contrast(1.2)',
    vintage: 'sepia(0.4) contrast(1.15) brightness(0.95)'
};

/**
 * Open Image Studio Modal with the provided image source.
 * @param {string} imageSrc - ObjectURL or DataURL of the image.
 * @param {object} options - Configuration options (title, aspectRatio, etc.)
 * @param {function} onApply - Callback returning { blob, dataUrl, file }
 */
function openImageEditor(imageSrc, options = {}, onApply = null) {
    const modal = document.getElementById('image-editor-modal');
    const targetImg = document.getElementById('image-editor-target');
    const titleEl = document.getElementById('image-editor-title');

    if (!modal || !targetImg) return;

    activeEditorOriginalSrc = imageSrc;
    activeEditorCallback = onApply;
    activeFilterMode = 'normal';
    activeFlipH = false;
    activeFlipV = false;

    if (titleEl && options.title) {
        titleEl.textContent = options.title;
    }

    // Reset filter preset buttons
    document.querySelectorAll('.filter-preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'normal');
    });

    // Reset aspect ratio buttons
    const defaultRatio = options.aspectRatio !== undefined ? options.aspectRatio : 'free';
    document.querySelectorAll('.ratio-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.ratio == defaultRatio);
    });

    // Destroy existing cropper if any
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }

    targetImg.src = imageSrc;
    modal.classList.add('active');

    // Initialize Cropper when image has loaded
    targetImg.onload = () => {
        initCropperInstance(options.aspectRatio);
    };

    if (targetImg.complete) {
        initCropperInstance(options.aspectRatio);
    }
}

function initCropperInstance(aspectRatio) {
    const targetImg = document.getElementById('image-editor-target');
    if (!targetImg || typeof Cropper === 'undefined') return;

    if (cropperInstance) {
        cropperInstance.destroy();
    }

    let ratioVal = NaN;
    if (aspectRatio && aspectRatio !== 'free') {
        ratioVal = parseFloat(aspectRatio);
    }

    cropperInstance = new Cropper(targetImg, {
        aspectRatio: ratioVal,
        viewMode: 1, // Keep crop box within image boundary
        dragMode: 'move',
        autoCropArea: 0.9,
        responsive: true,
        restore: false,
        guides: true,
        center: true,
        highlight: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        ready() {
            applyCurrentFilterToCropper();
        }
    });
}

function closeImageEditor() {
    const modal = document.getElementById('image-editor-modal');
    if (modal) modal.classList.remove('active');

    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
}

function applyCurrentFilterToCropper() {
    const filterStyle = FILTER_STYLES[activeFilterMode] || '';
    const cropperCanvas = document.querySelector('.cropper-container .cropper-canvas img');
    const cropperViewBox = document.querySelector('.cropper-container .cropper-view-box img');

    if (cropperCanvas) cropperCanvas.style.filter = filterStyle;
    if (cropperViewBox) cropperViewBox.style.filter = filterStyle;
}

// Attach event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // 1. Aspect Ratio selector
    const ratioBtns = document.querySelectorAll('.ratio-btn');
    ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!cropperInstance) return;
            ratioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const ratioVal = btn.dataset.ratio;
            if (ratioVal === 'free') {
                cropperInstance.setAspectRatio(NaN);
            } else {
                cropperInstance.setAspectRatio(parseFloat(ratioVal));
            }
        });
    });

    // 2. Transform controls
    const btnRotateLeft = document.getElementById('editor-rotate-left');
    const btnRotateRight = document.getElementById('editor-rotate-right');
    const btnFlipH = document.getElementById('editor-flip-h');
    const btnFlipV = document.getElementById('editor-flip-v');
    const btnZoomIn = document.getElementById('editor-zoom-in');
    const btnZoomOut = document.getElementById('editor-zoom-out');
    const btnReset = document.getElementById('editor-reset');

    if (btnRotateLeft) {
        btnRotateLeft.addEventListener('click', () => cropperInstance && cropperInstance.rotate(-90));
    }
    if (btnRotateRight) {
        btnRotateRight.addEventListener('click', () => cropperInstance && cropperInstance.rotate(90));
    }
    if (btnFlipH) {
        btnFlipH.addEventListener('click', () => {
            if (!cropperInstance) return;
            activeFlipH = !activeFlipH;
            cropperInstance.scaleX(activeFlipH ? -1 : 1);
        });
    }
    if (btnFlipV) {
        btnFlipV.addEventListener('click', () => {
            if (!cropperInstance) return;
            activeFlipV = !activeFlipV;
            cropperInstance.scaleY(activeFlipV ? -1 : 1);
        });
    }
    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => cropperInstance && cropperInstance.zoom(0.1));
    }
    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => cropperInstance && cropperInstance.zoom(-0.1));
    }
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (!cropperInstance) return;
            activeFlipH = false;
            activeFlipV = false;
            activeFilterMode = 'normal';
            cropperInstance.reset();
            document.querySelectorAll('.filter-preset-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.filter === 'normal');
            });
            applyCurrentFilterToCropper();
        });
    }

    // 3. Filter preset buttons
    const filterBtns = document.querySelectorAll('.filter-preset-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilterMode = btn.dataset.filter || 'normal';
            applyCurrentFilterToCropper();
        });
    });

    // 4. Save & Apply Changes
    const applyBtn = document.getElementById('image-editor-apply-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            if (!cropperInstance) return;

            applyBtn.disabled = true;
            applyBtn.innerHTML = '<span>Processing...</span>';

            try {
                const croppedCanvas = cropperInstance.getCroppedCanvas({
                    maxWidth: 2048,
                    maxHeight: 2048,
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high'
                });

                if (!croppedCanvas) {
                    showToast('Could not crop image.', 'error');
                    applyBtn.disabled = false;
                    applyBtn.innerHTML = '<span>Apply & Save</span>';
                    return;
                }

                // Render with active filter onto export canvas
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = croppedCanvas.width;
                exportCanvas.height = croppedCanvas.height;
                const ctx = exportCanvas.getContext('2d');

                const filterStyle = FILTER_STYLES[activeFilterMode];
                if (filterStyle) {
                    ctx.filter = filterStyle;
                }
                ctx.drawImage(croppedCanvas, 0, 0);

                exportCanvas.toBlob(blob => {
                    if (!blob) {
                        showToast('Error generating image file.', 'error');
                        applyBtn.disabled = false;
                        applyBtn.innerHTML = '<span>Apply & Save</span>';
                        return;
                    }

                    const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
                    const editedFile = new File([blob], 'edited_image.jpg', { type: 'image/jpeg' });

                    if (typeof activeEditorCallback === 'function') {
                        activeEditorCallback({
                            blob: blob,
                            dataUrl: dataUrl,
                            file: editedFile
                        });
                    }

                    closeImageEditor();
                    applyBtn.disabled = false;
                    applyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Apply & Save</span>';
                }, 'image/jpeg', 0.92);
            } catch (err) {
                console.error('Image editor error:', err);
                showToast('Failed to apply image edits.', 'error');
                applyBtn.disabled = false;
                applyBtn.innerHTML = '<span>Apply & Save</span>';
            }
        });
    }
});
