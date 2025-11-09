import { z } from 'zod';

export const OrderItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  quantity: z.number().int().positive().max(50),
});

export const OrderPayloadSchema = z.object({
  cart: z.array(OrderItemSchema).min(1),
  summary: z.object({
    deliveryCharge: z.number().min(0).max(500),
  }),
  locationId: z.string().min(1),
  pointsUsed: z.number().int().min(0).optional().default(0),
  discountFromPoints: z.number().min(0).optional().default(0),
  paymentMethod: z.enum(['cod']).default('cod'),
});

export const ReferralApplySchema = z.object({
  userId: z.string().uuid(),
  referralCode: z.string().min(4).max(50),
});
