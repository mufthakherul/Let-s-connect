/**
 * User Service - Auth Validation Tests
 * Phase 1: Service-level validation standards
 */

const {
  registerSchema,
  loginSchema,
  checkUsernameSchema
} = require('../src/validators/authValidators');

describe('User Service Auth Validation Schemas', () => {
  describe('registerSchema', () => {
    it('accepts a valid registration payload', () => {
      const { error } = registerSchema.validate({
        username: 'validuser',
        email: 'valid@example.com',
        password: 'SecurePass123!',
        firstName: 'Valid',
        lastName: 'User'
      });

      expect(error).toBeUndefined();
    });

    it('rejects missing required fields', () => {
      const { error } = registerSchema.validate(
        {
          username: 'validuser'
        },
        { abortEarly: false }
      );

      expect(error).toBeDefined();
      const messages = error.details.map((d) => d.message).join(' | ');
      expect(messages).toContain('"email" is required');
      expect(messages).toContain('"password" is required');
    });

    it('rejects short password', () => {
      const { error } = registerSchema.validate({
        username: 'validuser',
        email: 'valid@example.com',
        password: 'short'
      });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('"password" length must be at least 8 characters long');
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login payload', () => {
      const { error } = loginSchema.validate({
        email: 'valid@example.com',
        password: 'some-password'
      });

      expect(error).toBeUndefined();
    });

    it('rejects invalid email format', () => {
      const { error } = loginSchema.validate({
        email: 'not-an-email',
        password: 'some-password'
      });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('"email" must be a valid email');
    });
  });

  describe('checkUsernameSchema', () => {
    it('accepts a valid username query', () => {
      const { error } = checkUsernameSchema.validate({ username: 'newuser123' });

      expect(error).toBeUndefined();
    });

    it('rejects invalid username characters', () => {
      const { error } = checkUsernameSchema.validate({ username: 'bad-user' });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('"username" must only contain alpha-numeric characters');
    });
  });
});
