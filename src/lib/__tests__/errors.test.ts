import { describe, it, expect } from 'vitest';
import {
  AppError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  IntegrationError,
  handleError,
  getUserFriendlyErrorMessage,
} from '../errors';

describe('Error Classes', () => {
  it('should create AppError with correct properties', () => {
    const error = new AppError('Test message', 'TEST_ERROR', 400, 'Test hint');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.hint).toBe('Test hint');
    expect(error.name).toBe('AppError');
  });

  it('should create AuthenticationError with default message', () => {
    const error = new AuthenticationError();
    expect(error.message).toBe('Authentication required');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.statusCode).toBe(401);
  });

  it('should create ValidationError with custom message', () => {
    const error = new ValidationError('Invalid input', 'Check your data');
    expect(error.message).toBe('Invalid input');
    expect(error.hint).toBe('Check your data');
    expect(error.statusCode).toBe(400);
  });

  it('should create NetworkError with default message', () => {
    const error = new NetworkError();
    expect(error.message).toBe('Network request failed');
    expect(error.statusCode).toBe(503);
  });

  it('should create IntegrationError with provider info', () => {
    const error = new IntegrationError('Stripe', 'Payment failed');
    expect(error.provider).toBe('Stripe');
    expect(error.message).toBe('Payment failed');
    expect(error.statusCode).toBe(502);
  });
});

describe('Error Handlers', () => {
  it('should handle AppError correctly', () => {
    const error = new ValidationError('Invalid email', 'Check format');
    const result = handleError(error);

    expect(result.message).toBe('Invalid email');
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.hint).toBe('Check format');
  });

  it('should handle generic Error', () => {
    const error = new Error('Generic error');
    const result = handleError(error);

    expect(result.message).toBe('Generic error');
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.hint).toBeUndefined();
  });

  it('should handle unknown error types', () => {
    const result = handleError('string error');

    expect(result.message).toBe('An unexpected error occurred');
    expect(result.code).toBe('UNKNOWN_ERROR');
  });
});

describe('User-Friendly Error Messages', () => {
  it('should return friendly message for AUTH_ERROR', () => {
    const error = new AuthenticationError();
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe('Please sign in to continue');
  });

  it('should return friendly message for NETWORK_ERROR', () => {
    const error = new NetworkError();
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe('Unable to connect. Please check your internet connection');
  });

  it('should return original message for unknown error codes', () => {
    const error = new AppError('Custom error', 'CUSTOM_CODE');
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe('Custom error');
  });
});
