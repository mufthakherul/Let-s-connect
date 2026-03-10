/**
 * Gateway Resilience Configuration
 * Phase 2 - Workstream D3: Reliability controls
 * 
 * Implements:
 * - Per-service timeout configuration
 * - Retry policies for transient failures
 * - Circuit breaker pattern for dependency failures
 */

const logger = require('../shared/logger');
const { logCircuitBreakerStateChange, createTimer } = require('../shared/logging-utils');

/**
 * Service-specific timeout and retry configuration
 * Timeouts are in milliseconds
 */
const serviceConfig = {
    user: {
        timeout: 5000,        // 5 seconds - auth operations should be fast
        retries: 2,
        circuitThreshold: 5,  // Open circuit after 5 failures
        circuitTimeout: 30000 // 30 seconds before trying again
    },
    content: {
        timeout: 10000,       // 10 seconds - may involve DB queries
        retries: 3,
        circuitThreshold: 5,
        circuitTimeout: 30000
    },
    messaging: {
        timeout: 8000,        // 8 seconds
        retries: 2,
        circuitThreshold: 5,
        circuitTimeout: 30000
    },
    collaboration: {
        timeout: 15000,       // 15 seconds - real-time operations
        retries: 2,
        circuitThreshold: 5,
        circuitTimeout: 30000
    },
    media: {
        timeout: 30000,       // 30 seconds - media processing can be slow
        retries: 1,           // Less retries for long operations
        circuitThreshold: 3,
        circuitTimeout: 60000 // 1 minute cooldown
    },
    shop: {
        timeout: 10000,       // 10 seconds
        retries: 3,
        circuitThreshold: 5,
        circuitTimeout: 30000
    },
    ai: {
        timeout: 60000,       // 60 seconds - AI operations can be slow
        retries: 1,
        circuitThreshold: 3,
        circuitTimeout: 120000 // 2 minutes cooldown
    },
    streaming: {
        timeout: 20000,       // 20 seconds
        retries: 2,
        circuitThreshold: 5,
        circuitTimeout: 30000
    }
};

/**
 * Circuit Breaker implementation
 * Tracks failure rates and opens/closes circuits per service
 */
class CircuitBreaker {
    constructor(serviceName, config) {
        this.serviceName = serviceName;
        this.failureThreshold = config.circuitThreshold || 5;
        this.timeout = config.circuitTimeout || 30000;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }

    /**
     * Check if the circuit allows requests
     */
    canAttempt() {
        if (this.state === 'CLOSED') {
            return true;
        }

        if (this.state === 'OPEN') {
            const now = Date.now();
            const timeSinceFailure = now - this.lastFailureTime;

            if (timeSinceFailure > this.timeout) {
                logCircuitBreakerStateChange(logger, this.serviceName, 'OPEN', 'HALF_OPEN', 'Timeout expired');
                this.state = 'HALF_OPEN';
                return true;
            }

            return false;
        }

        // HALF_OPEN state - allow one request through
        if (this.state === 'HALF_OPEN') {
            return true;
        }

        return false;
    }

    /**
     * Record a successful request
     */
    recordSuccess() {
        if (this.state === 'HALF_OPEN') {
            logCircuitBreakerStateChange(logger, this.serviceName, 'HALF_OPEN', 'CLOSED', 'Successful request');
            this.state = 'CLOSED';
            this.failureCount = 0;
        } else if (this.state === 'CLOSED') {
            // Gradually reduce failure count on success
            if (this.failureCount > 0) {
                this.failureCount--;
            }
        }
    }

    /**
     * Record a failed request
     */
    recordFailure(error) {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === 'HALF_OPEN') {
            logCircuitBreakerStateChange(logger, this.serviceName, 'HALF_OPEN', 'OPEN', `Failure: ${error.message}`);
            this.state = 'OPEN';
        } else if (this.failureCount >= this.failureThreshold) {
            logCircuitBreakerStateChange(logger, this.serviceName, 'CLOSED', 'OPEN', `${this.failureCount} failures reached threshold`);
            this.state = 'OPEN';
        }
    }

    /**
     * Get current circuit state
     */
    getState() {
        return {
            serviceName: this.serviceName,
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime
        };
    }
}

// Circuit breaker instances per service
const circuitBreakers = {};

/**
 * Get or create circuit breaker for a service
 */
function getCircuitBreaker(serviceName) {
    if (!circuitBreakers[serviceName]) {
        const config = serviceConfig[serviceName] || {
            circuitThreshold: 5,
            circuitTimeout: 30000
        };
        circuitBreakers[serviceName] = new CircuitBreaker(serviceName, config);
    }
    return circuitBreakers[serviceName];
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error) {
    // Don't retry client errors (4xx)
    if (error.statusCode >= 400 && error.statusCode < 500) {
        return false;
    }

    // Retry on network errors, timeouts, and 5xx server errors
    if (error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.name === 'TimeoutError' ||
        (error.statusCode >= 500)) {
        return true;
    }

    return false;
}

/**
 * Exponential backoff delay calculation
 */
function getRetryDelay(attempt) {
    // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc.
    const baseDelay = 100;
    const maxDelay = 2000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;

    return delay + jitter;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute request with retry logic
 */
async function executeWithRetry(serviceName, requestFn, attempt = 0) {
    const config = serviceConfig[serviceName] || { retries: 2 };
    const circuitBreaker = getCircuitBreaker(serviceName);

    // Check circuit breaker
    if (!circuitBreaker.canAttempt()) {
        const error = new Error(`Circuit breaker open for ${serviceName}`);
        error.code = 'CIRCUIT_OPEN';
        error.statusCode = 503;
        throw error;
    }

    try {
        const result = await requestFn();
        circuitBreaker.recordSuccess();
        return result;
    } catch (error) {
        // Record failure in circuit breaker
        circuitBreaker.recordFailure(error);

        // Check if we should retry
        if (attempt < config.retries && isRetryableError(error)) {
            const delay = getRetryDelay(attempt);

            logger.warn(`Retrying ${serviceName} request (attempt ${attempt + 1}/${config.retries}) after ${Math.round(delay)}ms`, {
                error: error.message,
                code: error.code,
                statusCode: error.statusCode
            });

            await sleep(delay);
            return executeWithRetry(serviceName, requestFn, attempt + 1);
        }

        // No more retries, throw the error
        throw error;
    }
}

/**
 * Get timeout configuration for a service
 */
function getServiceTimeout(serviceName) {
    return serviceConfig[serviceName]?.timeout || 10000; // Default 10 seconds
}

/**
 * Get all circuit breaker states (for monitoring)
 */
function getCircuitBreakerStates() {
    return Object.keys(circuitBreakers).map(serviceName =>
        circuitBreakers[serviceName].getState()
    );
}

/**
 * Reset a circuit breaker (for manual intervention)
 */
function resetCircuitBreaker(serviceName) {
    if (circuitBreakers[serviceName]) {
        logger.info(`Manually resetting circuit breaker for ${serviceName}`);
        circuitBreakers[serviceName].state = 'CLOSED';
        circuitBreakers[serviceName].failureCount = 0;
        return true;
    }
    return false;
}

module.exports = {
    serviceConfig,
    executeWithRetry,
    getServiceTimeout,
    getCircuitBreaker,
    getCircuitBreakerStates,
    resetCircuitBreaker,
    CircuitBreaker
};
