export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/utils/firebaseAdmin'; // 🔥 Using the safe getter

export async function POST(req: Request) {
  try {
    // 🛡️ 1. SAFE INITIALIZATION
    const adminDb = getAdminDb();

    // Guard against null (specifically for build-time or missing key scenarios)
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database initializing. Please try again.' }, 
        { status: 503 }
      );
    }

    const body = await req.json();
    const { productId, userId, userName, rating, comment, imageUrl } = body;

    if (!userId || !productId) {
      return NextResponse.json({ error: 'Data payload incomplete.' }, { status: 400 });
    }

    // 2. VERIFY PURCHASE STATUS
    // Pull all "delivered" orders for this specific user
    // ... (previous code)

    // 2. VERIFY PURCHASE STATUS
    const ordersSnapshot = await adminDb
      .collection('orders')
      .where('user_id', '==', userId)
      .where('status', '==', 'delivered')
      .get();

    let hasPurchased = false;

    // 🔥 FIX: Use a for...of loop for better Type Inference
    for (const doc of ordersSnapshot.docs) {
      const order = doc.data();
      const items = order.items || [];
      
      // Explicitly typing 'item' to avoid 'any' errors
      if (items.some((item: { product: { id: string } }) => item.product.id === productId)) {
        hasPurchased = true;
        break; // Stop looking once we find a match
      }
    }
    
    // 3. SECURITY REJECTION
    if (!hasPurchased) {
      return NextResponse.json(
        { error: 'Security Alert: You can only review components that have been physically delivered to you.' }, 
        { status: 403 }
      );
    }

    // 4. PUBLISH REVIEW
    const newReview = {
      product_id: productId,
      user_id: userId,
      user_name: userName,
      rating: Number(rating),
      comment: comment || '',
      image_url: imageUrl || null,
      created_at: new Date().toISOString()
    };

    await adminDb.collection('reviews').add(newReview);

    return NextResponse.json({ success: true, message: 'Review published securely!' });

  } catch (error: any) {
    console.error('Review API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}