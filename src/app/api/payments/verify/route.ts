import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cafe_order_id, // Our database order ID
    } = await request.json();

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment verification parameters' },
        { status: 400 }
      );
    }

    // Verify Razorpay signature (security check)
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // ✅ Payment verified! Now update order status in database
    if (cafe_order_id) {
      const supabase = await createClient();
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          // You can add a new column 'payment_id' to store Razorpay payment ID
          // payment_id: razorpay_payment_id,
        })
        .eq('id', cafe_order_id);

      if (updateError) {
        console.error('Order status update failed:', updateError);
        // Payment succeeded but DB update failed - log this for manual review
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
    });
  } catch (error: any) {
    console.error('Payment Verification Error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
