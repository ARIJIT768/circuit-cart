import { NextResponse } from 'next/server';
import { adminDb } from '@/utils/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, userId, userName, rating, comment, imageUrl } = body;

    if (!userId || !productId) {
      return NextResponse.json({ error: 'Data payload incomplete.' }, { status: 400 });
    }

    // Pull all "delivered" orders for this specific user directly from the secure database
    const ordersSnapshot = await adminDb
      .collection('orders')
      .where('user_id', '==', userId)
      .where('status', '==', 'delivered')
      .get();

    // Check if the product they are reviewing is inside any of those delivered orders
    let hasPurchased = false;
    ordersSnapshot.forEach((doc) => {
      const order = doc.data();
      const items = order.items || [];
      if (items.some((item: any) => item.product.id === productId)) {
        hasPurchased = true;
      }
    });

    // If they didn't buy it, reject the review immediately
    if (!hasPurchased) {
      return NextResponse.json(
        { error: 'Security Alert: You can only review components that have been physically delivered to you.' }, 
        { status: 403 }
      );
    }

    // If they did buy it, save the review!
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