import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plan: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        default: 'free'
    },
    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true });

// Auto-generate slug from name before saving
workspaceSchema.pre('save', function (next) {
    if (this.isModified('name') || !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).substr(2, 5);
    }
    next();
});

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
