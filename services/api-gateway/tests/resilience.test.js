/**
 * Tests for Gateway Resilience Configuration
 * Phase 2 - Testing resilience controls
 */

const {
  serviceConfig,
  CircuitBreaker,
  getServiceTimeout,
  getCircuitBreaker,
  executeWithRetry,
  getCircuitBreakerStates,
  resetCircuitBreaker
} = require('../resilience-config');

describe('Resilience Configuration', () => {
  describe('Service Configuration', () => {
    it('should have timeout configuration for all services', () => {
      expect(serviceConfig.user).toBeDefined();
      expect(serviceConfig.user.timeout).toBeGreaterThan(0);
      expect(serviceConfig.content).toBeDefined();
      expect(serviceConfig.messaging).toBeDefined();
      expect(serviceConfig.ai).toBeDefined();
    });

    it('should have retry configuration for all services', () => {
      expect(serviceConfig.user.retries).toBeGreaterThan(0);
      expect(serviceConfig.content.retries).toBeGreaterThan(0);
    });

    it('should have circuit breaker configuration', () => {
      expect(serviceConfig.user.circuitThreshold).toBeGreaterThan(0);
      expect(serviceConfig.user.circuitTimeout).toBeGreaterThan(0);
    });
  });

  describe('Circuit Breaker', () => {
    let circuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker('test-service', {
        circuitThreshold: 3,
        circuitTimeout: 1000
      });
    });

    it('should start in CLOSED state', () => {
      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.canAttempt()).toBe(true);
    });

    it('should open circuit after threshold failures', () => {
      const error = new Error('Service error');
      
      circuitBreaker.recordFailure(error);
      expect(circuitBreaker.state).toBe('CLOSED');
      
      circuitBreaker.recordFailure(error);
      expect(circuitBreaker.state).toBe('CLOSED');
      
      circuitBreaker.recordFailure(error);
      expect(circuitBreaker.state).toBe('OPEN');
      expect(circuitBreaker.canAttempt()).toBe(false);
    });

    it('should transition to HALF_OPEN after timeout', (done) => {
      const error = new Error('Service error');
      
      // Trigger circuit to open
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure(error);
      }
      
      expect(circuitBreaker.state).toBe('OPEN');
      
      // Wait for timeout
      setTimeout(() => {
        expect(circuitBreaker.canAttempt()).toBe(true);
        expect(circuitBreaker.state).toBe('HALF_OPEN');
        done();
      }, 1100);
    }, 2000);

    it('should close circuit on success in HALF_OPEN state', () => {
      const error = new Error('Service error');
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure(error);
      }
      
      // Manually set to HALF_OPEN
      circuitBreaker.state = 'HALF_OPEN';
      
      circuitBreaker.recordSuccess();
      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.failureCount).toBe(0);
    });

    it('should reopen circuit on failure in HALF_OPEN state', () => {
      const error = new Error('Service error');
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure(error);
      }
      
      // Manually set to HALF_OPEN
      circuitBreaker.state = 'HALF_OPEN';
      
      circuitBreaker.recordFailure(error);
      expect(circuitBreaker.state).toBe('OPEN');
    });

    it('should gradually reduce failure count on success', () => {
      const error = new Error('Service error');
      
      circuitBreaker.recordFailure(error);
      expect(circuitBreaker.failureCount).toBe(1);
      
      circuitBreaker.recordSuccess();
      expect(circuitBreaker.failureCount).toBe(0);
    });

    it('should return current state info', () => {
      const state = circuitBreaker.getState();
      
      expect(state.serviceName).toBe('test-service');
      expect(state.state).toBe('CLOSED');
      expect(state.failureCount).toBe(0);
      expect(state.lastFailureTime).toBeNull();
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await executeWithRetry('user', mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      
      const mockFn = jest.fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const result = await executeWithRetry('user', mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should not retry on 4xx errors', async () => {
      const error = new Error('Bad request');
      error.statusCode = 400;
      
      const mockFn = jest.fn().mockRejectedValue(error);
      
      await expect(executeWithRetry('user', mockFn)).rejects.toThrow('Bad request');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw error when circuit is open', async () => {
      const circuitBreaker = getCircuitBreaker('test-circuit-service');
      circuitBreaker.state = 'OPEN';
      circuitBreaker.lastFailureTime = Date.now();
      
      const mockFn = jest.fn().mockResolvedValue('success');
      
      await expect(executeWithRetry('test-circuit-service', mockFn)).rejects.toThrow('Circuit breaker open');
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should respect retry limit', async () => {
      const error = new Error('Service unavailable');
      error.statusCode = 503;
      
      const mockFn = jest.fn().mockRejectedValue(error);
      
      await expect(executeWithRetry('user', mockFn)).rejects.toThrow('Service unavailable');
      
      // user service has 2 retries, so should be called 3 times total (initial + 2 retries)
      expect(mockFn).toHaveBeenCalledTimes(3);
    }, 10000);
  });

  describe('getServiceTimeout', () => {
    it('should return configured timeout for known service', () => {
      expect(getServiceTimeout('user')).toBe(5000);
      expect(getServiceTimeout('ai')).toBe(60000);
      expect(getServiceTimeout('media')).toBe(30000);
    });

    it('should return default timeout for unknown service', () => {
      expect(getServiceTimeout('unknown')).toBe(10000);
    });
  });

  describe('Circuit Breaker Management', () => {
    it('should get circuit breaker for service', () => {
      const cb = getCircuitBreaker('user');
      expect(cb).toBeInstanceOf(CircuitBreaker);
      expect(cb.serviceName).toBe('user');
    });

    it('should reuse circuit breaker instance', () => {
      const cb1 = getCircuitBreaker('user');
      const cb2 = getCircuitBreaker('user');
      expect(cb1).toBe(cb2);
    });

    it('should get all circuit breaker states', () => {
      getCircuitBreaker('user');
      getCircuitBreaker('content');
      
      const states = getCircuitBreakerStates();
      expect(states.length).toBeGreaterThanOrEqual(2);
      expect(states[0]).toHaveProperty('serviceName');
      expect(states[0]).toHaveProperty('state');
    });

    it('should reset circuit breaker', () => {
      const cb = getCircuitBreaker('test-reset-service');
      const error = new Error('Test error');
      
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        cb.recordFailure(error);
      }
      
      expect(cb.state).toBe('OPEN');
      
      const success = resetCircuitBreaker('test-reset-service');
      expect(success).toBe(true);
      expect(cb.state).toBe('CLOSED');
      expect(cb.failureCount).toBe(0);
    });

    it('should return false when resetting non-existent circuit', () => {
      const success = resetCircuitBreaker('non-existent-service');
      expect(success).toBe(false);
    });
  });
});
