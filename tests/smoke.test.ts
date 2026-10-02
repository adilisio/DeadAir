import { describe, it, expect } from 'vitest';
import { W, H } from '../src/config';

describe('config', () => {
  it('uses a 16:9 logical screen', () => {
    expect(W / H).toBeCloseTo(16 / 9);
  });
});
