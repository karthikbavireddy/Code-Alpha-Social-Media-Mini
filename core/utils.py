import base64
import io
import logging
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)


def generate_optimized_data_uri(image_file, max_size=(1080, 1080), quality=80):
    """
    Generate an optimized base64 data URI for an uploaded image file.
    Provides persistent image fallback across ephemeral container restarts on Render free tier.
    """
    if not image_file:
        return None
    try:
        if hasattr(image_file, 'seek'):
            image_file.seek(0)

        img = Image.open(image_file)

        # Normalize image orientation from EXIF if present
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        # Determine target format & color mode
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            img_format = 'PNG'
            img = img.convert('RGBA')
            mime_type = 'image/png'
        else:
            img_format = 'JPEG'
            img = img.convert('RGB')
            mime_type = 'image/jpeg'

        # Resize while maintaining aspect ratio
        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        if img_format == 'JPEG':
            img.save(buffer, format='JPEG', quality=quality, optimize=True)
        else:
            img.save(buffer, format='PNG', optimize=True)

        buffer.seek(0)
        encoded = base64.b64encode(buffer.getvalue()).decode('utf-8')

        if hasattr(image_file, 'seek'):
            image_file.seek(0)

        return f"data:{mime_type};base64,{encoded}"
    except Exception as e:
        logger.warning(f"Could not generate persistent data URI for image: {e}")
        try:
            if hasattr(image_file, 'seek'):
                image_file.seek(0)
        except Exception:
            pass
        return None
