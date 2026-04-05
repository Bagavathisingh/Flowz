/**
 * AES-256-GCM Encryption Service
 * Used exclusively by the Secrets Vault.
 * Key must be 64 hex chars (32 bytes) set in MASTER_ENCRYPTION_KEY env var.
 *
 * Generate key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

const getKey = () => {
    const hex = process.env.MASTER_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error(
            '[Crypto] MASTER_ENCRYPTION_KEY must be a 64-character hex string. ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }
    return Buffer.from(hex, 'hex');
};

/**
 * Encrypt a plaintext string.
 * @returns {{ iv: string, ciphertext: string, tag: string }}
 */
export const encrypt = (plaintext) => {
    const key = getKey();
    const iv = crypto.randomBytes(12); // 96-bit IV — GCM standard
    const cipher = crypto.createCipheriv(ALGO, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag(); // 128-bit auth tag

    return {
        iv: iv.toString('hex'),
        ciphertext: encrypted.toString('hex'),
        tag: tag.toString('hex')
    };
};

/**
 * Decrypt a previously encrypted secret.
 * @param {{ iv: string, ciphertext: string, tag: string }} encrypted
 * @returns {string} plaintext
 */
export const decrypt = ({ iv, ciphertext, tag }) => {
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    return (
        decipher.update(ciphertext, 'hex', 'utf8') +
        decipher.final('utf8')
    );
};
