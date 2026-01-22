import { NextResponse } from 'next/server';
import {
  PHOTO_MAX_WIDTH,
  PHOTO_MAX_HEIGHT,
  PHOTO_THUMB_WIDTH,
  PHOTO_THUMB_HEIGHT,
} from '@/lib/constants';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ photoName: string }> }
) {
  try {
    const { photoName } = await params;
    const { searchParams } = new URL(request.url);
    const size = searchParams.get('size'); // 'thumb' for thumbnails

    if (!photoName) {
      return new NextResponse('Photo name is required', { status: 400 });
    }

    // Validate API key
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('Missing GOOGLE_PLACES_API_KEY');
      return new NextResponse('Server configuration error', { status: 500 });
    }

    const decodedName = decodeURIComponent(photoName);

    // Use smaller dimensions for thumbnails (saves API costs)
    const width = size === 'thumb' ? PHOTO_THUMB_WIDTH : PHOTO_MAX_WIDTH;
    const height = size === 'thumb' ? PHOTO_THUMB_HEIGHT : PHOTO_MAX_HEIGHT;

    // Build Google Places Photo URL
    const photoUrl =
      `https://places.googleapis.com/v1/${decodedName}/media?` +
      new URLSearchParams({
        key: process.env.GOOGLE_PLACES_API_KEY,
        maxWidthPx: width.toString(),
        maxHeightPx: height.toString(),
      });

    const response = await fetch(photoUrl);

    if (!response.ok) {
      console.error('Photo fetch failed:', response.status);
      return new NextResponse('Photo not found', { status: 404 });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable', // 7 days
      },
    });
  } catch (error) {
    console.error('Photo proxy error:', error);
    return new NextResponse('Failed to load photo', { status: 500 });
  }
}
