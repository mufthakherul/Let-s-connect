/**
 * Mobile utility helpers for haptics and camera access.
 */

const HAPTIC_PATTERNS = {
    light: [8],
    selection: [6],
    medium: [16],
    success: [12, 20, 12],
    warning: [24, 40, 24],
    error: [40, 24, 40, 24, 40]
};

export function isHapticSupported() {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function triggerHapticFeedback(pattern = 'light') {
    if (!isHapticSupported()) {
        return false;
    }

    const vibrationPattern = HAPTIC_PATTERNS[pattern] || HAPTIC_PATTERNS.light;
    return navigator.vibrate(vibrationPattern);
}

export function supportsCameraCapture() {
    return Boolean(
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function'
    );
}

export async function requestCameraStream(constraints = { video: { facingMode: 'environment' }, audio: false }) {
    if (!supportsCameraCapture()) {
        throw new Error('Camera access is not supported in this browser');
    }

    return navigator.mediaDevices.getUserMedia(constraints);
}
