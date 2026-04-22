/**
 * Validation utilities for connection configuration
 */

import type { ConnectionCredentials, NodeAPICredentials, SSHCredentials } from '../types';

/**
 * Validate URL format for Node API (must be https://)
 */
export function validateNodeURL(url: string): { valid: boolean; error?: string } {
    if (!url || url.trim() === '') {
        return { valid: false, error: 'URL is required' };
    }

    const trimmedUrl = url.trim();

    // Must start with https://
    if (!trimmedUrl.startsWith('https://')) {
        return { valid: false, error: 'Node API URL must use HTTPS protocol (https://)' };
    }

    // Basic URL validation
    try {
        const urlObj = new URL(trimmedUrl);
        if (urlObj.protocol !== 'https:') {
            return { valid: false, error: 'Node API URL must use HTTPS protocol' };
        }
        return { valid: true };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/**
 * Validate SSH URL format (must be ssh://)
 */
export function validateSSHURL(url: string): { valid: boolean; error?: string } {
    if (!url || url.trim() === '') {
        return { valid: false, error: 'SSH URL is required' };
    }

    const trimmedUrl = url.trim();

    // Must start with ssh://
    if (!trimmedUrl.startsWith('ssh://')) {
        return { valid: false, error: 'SSH URL must use SSH protocol (ssh://)' };
    }

    // Basic format validation: ssh://hostname:port
    const sshUrlPattern = /^ssh:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/;
    if (!sshUrlPattern.test(trimmedUrl)) {
        return { valid: false, error: 'Invalid SSH URL format. Expected: ssh://hostname:port' };
    }

    return { valid: true };
}

/**
 * Validate Node API credentials
 */
export function validateNodeAPICredentials(credentials: NodeAPICredentials): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Validate URL
    const urlValidation = validateNodeURL(credentials.url);
    if (!urlValidation.valid) {
        errors.url = urlValidation.error || 'Invalid URL';
    }

    // Validate username
    if (!credentials.username || credentials.username.trim() === '') {
        errors.username = 'Username is required';
    }

    // Validate password
    if (!credentials.password || credentials.password.trim() === '') {
        errors.password = 'Password is required';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Validate SSH credentials
 */
export function validateSSHCredentials(credentials: SSHCredentials): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Validate URL
    const urlValidation = validateSSHURL(credentials.url);
    if (!urlValidation.valid) {
        errors.url = urlValidation.error || 'Invalid SSH URL';
    }

    // Validate username
    if (!credentials.username || credentials.username.trim() === '') {
        errors.username = 'Username is required';
    }

    // Validate authentication method specific fields
    if (credentials.authMethod === 'password') {
        if (!credentials.password || credentials.password.trim() === '') {
            errors.password = 'Password is required';
        }
    } else if (credentials.authMethod === 'privateKey') {
        if (!credentials.privateKey || credentials.privateKey.trim() === '') {
            errors.privateKey = 'Private key is required';
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Validate connection credentials based on access_type
 */
export function validateCredentials(credentials: ConnectionCredentials): { valid: boolean; errors: Record<string, string> } {
    if (credentials.access_type === 'ssh') {
        return validateSSHCredentials(credentials as SSHCredentials);
    } else {
        return validateNodeAPICredentials(credentials as NodeAPICredentials);
    }
}

/**
 * Check if all mandatory fields are filled (basic check)
 */
export function hasAllMandatoryFields(credentials: ConnectionCredentials): boolean {
    if (credentials.access_type === 'ssh') {
        const sshCreds = credentials as SSHCredentials;
        const hasBasicFields = !!(sshCreds.url && sshCreds.username);

        if (sshCreds.authMethod === 'password') {
            return hasBasicFields && !!sshCreds.password;
        } else {
            return hasBasicFields && !!sshCreds.privateKey;
        }
    } else {
        const nodeCreds = credentials as NodeAPICredentials;
        return !!(nodeCreds.url && nodeCreds.username && nodeCreds.password);
    }
}

