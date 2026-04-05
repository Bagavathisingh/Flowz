/**
 * Secret Model
 * Stores encrypted credentials for the secrets vault.
 * Values are NEVER stored or returned as plaintext.
 *
 * Example stored document:
 * {
 *   name: "MY_OPENAI_KEY",
 *   userId: ObjectId("..."),
 *   iv: "a3f1...",
 *   ciphertext: "9b2c...",
 *   tag: "4e7a..."
 * }
 *
 * In workflow nodes, reference as: {{secret.MY_OPENAI_KEY}}
 */
import mongoose from 'mongoose';

const SecretSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        match: [/^[A-Z0-9_]+$/, 'Secret name must be uppercase letters, numbers, and underscores only']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // AES-256-GCM encrypted fields
    iv: { type: String, required: true },
    ciphertext: { type: String, required: true },
    tag: { type: String, required: true }
}, { timestamps: true });

// Each user can only have one secret per name
SecretSchema.index({ name: 1, userId: 1 }, { unique: true });

export default mongoose.model('Secret', SecretSchema);
