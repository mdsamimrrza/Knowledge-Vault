import mongoose from 'mongoose';

// ──── User ────
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  hashedPassword: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  plan: { type: String, enum: ["free", "premium"], default: "free" },
  otpSecret: { type: String },
  otpEnabled: { type: Boolean, default: false },
  resetPasswordOTP: { type: String },
  resetPasswordExpires: { type: Date },
  lastResetRequestAt: { type: Date },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.hashedPassword; // never expose password
    },
  },
});

export const UserModel = mongoose.model('User', userSchema);

// ──── Article ────
const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: { type: [String], default: [] },
  isPublic: { type: Boolean, default: false },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  slug: { type: String, unique: true, sparse: true },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      if (ret.authorId) ret.authorId = ret.authorId.toString();
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Text index for efficient search
articleSchema.index({ title: 'text', content: 'text' });

export const ArticleModel = mongoose.model('Article', articleSchema);

// ──── Version ────
const versionSchema = new mongoose.Schema({
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  content: { type: String, required: true },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, enum: ['CREATED', 'UPDATED', 'RESTORED'], default: 'UPDATED' },
  ipAddress: String,
  userAgent: String,
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      // Audit details are kept in DB only, not sent to UI
      delete ret.editedBy;
      delete ret.action;
      delete ret.ipAddress;
      delete ret.userAgent;
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Index for fast version lookups by article
versionSchema.index({ articleId: 1 });

export const VersionModel = mongoose.model('Version', versionSchema);

// ──── Favorite (per-user) ────
const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      ret.userId = ret.userId.toString();
      ret.articleId = ret.articleId.toString();
      delete ret._id;
      delete ret.__v;
    },
  },
});

// Each user can favorite an article only once
favoriteSchema.index({ userId: 1, articleId: 1 }, { unique: true });

export const FavoriteModel = mongoose.model('Favorite', favoriteSchema);
