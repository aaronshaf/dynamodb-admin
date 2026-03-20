import { describe, it, expect, beforeAll } from 'vitest';
import { NumberValue } from '@aws-sdk/lib-dynamodb';

// Apply the toJSON patch as the backend module does at import time.
beforeAll(async () => {
    await import('./backend');
});

describe('NumberValue JSON serialization', () => {
    it('serialises small integers as numbers', () => {
        expect(JSON.parse(JSON.stringify(new NumberValue('42')))).toBe(42);
        expect(JSON.parse(JSON.stringify(new NumberValue('0')))).toBe(0);
        expect(JSON.parse(JSON.stringify(new NumberValue('-5')))).toBe(-5);
    });

    it('serialises decimal values as numbers', () => {
        expect(JSON.parse(JSON.stringify(new NumberValue('3.14')))).toBe(3.14);
        expect(JSON.parse(JSON.stringify(new NumberValue('0.001')))).toBe(0.001);
    });

    it('serialises MAX_SAFE_INTEGER as a number', () => {
        const maxSafe = String(Number.MAX_SAFE_INTEGER);
        expect(JSON.parse(JSON.stringify(new NumberValue(maxSafe)))).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('serialises values exceeding safe integer range as strings', () => {
        const large = '1773962769160000125';
        expect(JSON.parse(JSON.stringify(new NumberValue(large)))).toBe(large);
    });

    it('serialises negative large values as strings', () => {
        const largeNeg = '-9007199254740999';
        expect(JSON.parse(JSON.stringify(new NumberValue(largeNeg)))).toBe(largeNeg);
    });

    it('preserves precision for values just beyond MAX_SAFE_INTEGER', () => {
        // 9007199254740993 cannot be exactly represented as a double
        const beyondSafe = '9007199254740993';
        expect(JSON.parse(JSON.stringify(new NumberValue(beyondSafe)))).toBe(beyondSafe);
    });

    it('works inside a nested object mimicking a DynamoDB item', () => {
        const item = {
            pk: 'user-123',
            insertedAt: new NumberValue('1773962769160000125'),
            version: new NumberValue('1'),
            score: new NumberValue('99.5'),
        };
        const parsed = JSON.parse(JSON.stringify(item));
        expect(parsed).toEqual({
            pk: 'user-123',
            insertedAt: '1773962769160000125',
            version: 1,
            score: 99.5,
        });
    });
});
