import sharp from 'sharp';

export async function optimizeImage(buffer: Buffer, isPhoto: boolean = true): Promise<Buffer> {
  try {
    let image = sharp(buffer);
    
    // Get image metadata
    const metadata = await image.metadata();
    
    // If it's a photo (not a document/receipt), apply more aggressive compression
    if (isPhoto) {
      // Resize if larger than 1500px on any side while maintaining aspect ratio
      if (metadata.width && metadata.width > 1500 || metadata.height && metadata.height > 1500) {
        image = image.resize(1500, 1500, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // Convert to JPEG and compress
      image = image.jpeg({ quality: 80, mozjpeg: true });
    } else {
      // For documents, use higher quality
      if (metadata.width && metadata.width > 2000 || metadata.height && metadata.height > 2000) {
        image = image.resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      image = image.jpeg({ quality: 90 });
    }
    
    return await image.toBuffer();
  } catch (error) {
    console.error('Error optimizing image:', error);
    return buffer; // Return original if optimization fails
  }
}