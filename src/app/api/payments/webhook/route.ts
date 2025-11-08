import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

/**
 * Razorpay Webhook Handler
 * 
 * ⚠️ This route will be used in PRODUCTION after client gets Live keys
 * 
 * Setup Instructions (for Live mode):
 * 1. Client adds webhook URL in Razorpay Dashboard:
 *    Settings → Webhooks → Add Webhook URL:
 *    https://yourdomain.com/api/payments/webhook
 * 
 * 2. Subscribe to events: payment.captured, payment.failed
 * 
 * 3. Get Webhook Secret from Razorpay and add to .env.local:
 *    RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature (only in production with webhook secret)
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (expectedSignature !== signature) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 400 }
        );
      }
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const event = payload.event;
    const paymentData = payload.payload.payment.entity;

    console.log('Razorpay Webhook Event:', event);

    // Handle payment.captured event
    if (event === 'payment.captured') {
      const paymentId = paymentData.id;
      const orderId = paymentData.order_id;
      const amount = paymentData.amount / 100; // Convert paise to rupees

      // Update order status in database
      const supabase = await createClient();
      
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          // payment_id: paymentId, // Add this column if needed
        })
        .eq('id', orderId);

      if (error) {
        console.error('Webhook: Order update failed:', error);
      } else {
        console.log(`Webhook: Order ${orderId} marked as confirmed`);
      }
    }

    // Handle payment.failed event
    if (event === 'payment.failed') {
      console.log('Payment failed:', paymentData);
      // Optionally update order status to 'payment_failed'
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
