import { describe, expect, it } from 'vitest';
import { defineError, isDomainError } from '../src/lib/errors';

describe('errors', () => {
  describe('defineError', () => {
    it('should create error factory with tag and message', () => {
      // Given
      const cartNotFound = defineError('CartNotFound', (cartId: string) => ({
        message: `Cart "${cartId}" does not exist`,
        data: { cartId },
      }));

      // When
      const error = cartNotFound('cart-123');

      // Then
      expect(error.tag).toBe('CartNotFound');
      expect(error.message).toBe('Cart "cart-123" does not exist');
      expect(error.data).toEqual({ cartId: 'cart-123' });
    });

    it('should create error factory without data', () => {
      // Given
      const unknownError = defineError('UnknownError', () => ({
        message: 'Unknown error occurred',
      }));

      // When
      const error = unknownError();

      // Then
      expect(error.tag).toBe('UnknownError');
      expect(error.message).toBe('Unknown error occurred');
      expect(error.data).toBeUndefined();
    });

    it('should support multiple parameters', () => {
      // Given
      const validationError = defineError(
        'ValidationError',
        (field: string, reason: string) => ({
          message: `Field "${field}" is invalid: ${reason}`,
          data: { field, reason },
        })
      );

      // When
      const error = validationError('email', 'must be a valid email address');

      // Then
      expect(error.tag).toBe('ValidationError');
      expect(error.message).toBe(
        'Field "email" is invalid: must be a valid email address'
      );
      expect(error.data).toEqual({
        field: 'email',
        reason: 'must be a valid email address',
      });
    });
  });

  describe('isDomainError', () => {
    it('should return true for valid DomainError', () => {
      const error = { tag: 'TestError', message: 'Test message' };
      expect(isDomainError(error)).toBe(true);
    });

    it('should return true when tag matches', () => {
      const error = { tag: 'CartNotFound', message: 'Cart not found' };
      expect(isDomainError(error, 'CartNotFound')).toBe(true);
    });

    it('should return false when tag does not match', () => {
      const error = { tag: 'CartNotFound', message: 'Cart not found' };
      expect(isDomainError(error, 'OrderNotFound')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isDomainError(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isDomainError('string')).toBe(false);
      expect(isDomainError(123)).toBe(false);
    });

    it('should return false when tag is not a string', () => {
      const error = { tag: 123, message: 'Test' };
      expect(isDomainError(error)).toBe(false);
    });

    it('should return false when message is not a string', () => {
      const error = { tag: 'Test', message: 123 };
      expect(isDomainError(error)).toBe(false);
    });

    it('should return false when tag is missing', () => {
      const error = { message: 'Test' };
      expect(isDomainError(error)).toBe(false);
    });

    it('should return false when message is missing', () => {
      const error = { tag: 'Test' };
      expect(isDomainError(error)).toBe(false);
    });

    it('should return true for DomainError with data property', () => {
      const error = {
        tag: 'TestError',
        message: 'Test message',
        data: { foo: 'bar' },
      };
      expect(isDomainError(error)).toBe(true);
    });
  });
});
