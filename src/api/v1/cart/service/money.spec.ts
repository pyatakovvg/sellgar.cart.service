import { multiplyPrice, sumPrices } from './money';

describe('Cart money', () => {
  it('uses exact decimal arithmetic at large quantities', () => {
    expect(multiplyPrice('9999999999.99', 2147483647)).toBe('21474836469978525163.53');
    expect(sumPrices(['0.10', '0.20'])).toBe('0.30');
    expect(multiplyPrice('0.00', 3)).toBe('0.00');
  });
});
