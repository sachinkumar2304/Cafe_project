import { describe, it, expect } from 'vitest';
import { OrderPayloadSchema, ReferralApplySchema } from '../src/lib/validation';

describe('Validation Schemas', () => {
  it('accepts a valid order payload', () => {
    const payload = {
      cart: [{ id: 1, quantity: 2 }],
      summary: { deliveryCharge: 20 },
      locationId: 'loc1',
      paymentMethod: 'cod',
    };
    const result = OrderPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid order payload', () => {
    const payload = {
      cart: [],
      summary: { deliveryCharge: -5 },
      locationId: '',
    };
    const result = OrderPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('accepts a valid referral payload', () => {
    const payload = { userId: '00000000-0000-0000-0000-000000000000', referralCode: 'ABC123' };
    const result = ReferralApplySchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects invalid referral payload', () => {
    const payload = { userId: 'not-a-uuid', referralCode: '' };
    const result = ReferralApplySchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
