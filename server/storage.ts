import { ArticleModel, VersionModel, UserModel, FavoriteModel } from './models';
import type { InsertArticle, Article, ArticleVersion, SearchParams, TagCount, User, RegisterInput } from '@shared/schema';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export interface IStorage {
  // Auth
  createUser(data: RegisterInput): Promise<User>;
  getUserByEmail(email: string): Promise<(User & { hashedPassword: string }) | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  updateUserStatus(id: string, updates: { isAdmin?: boolean, isBanned?: boolean, otpSecret?: string, otpEnabled?: boolean }): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Articles
  getArticles(params?: SearchParams, userId?: string): Promise<Article[]>;
  getArticle(id: string, userId?: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle, authorId?: string): Promise<Article>;
  updateArticle(id: string, article: Partial<InsertArticle>, userId?: string): Promise<Article | undefined>;
  deleteArticle(id: string): Promise<boolean>;
  getArticleBySlug(slug: string, userId?: string): Promise<Article | undefined>;
  getArticleVersions(articleId: string): Promise<ArticleVersion[]>;
  getAllTags(): Promise<TagCount[]>;
  restoreVersion(articleId: string, versionId: string, userId?: string): Promise<Article | undefined>;

  // Favorites (per-user)
  getUserFavoriteIds(userId: string): Promise<string[]>;
  addFavorite(userId: string, articleId: string): Promise<void>;
  removeFavorite(userId: string, articleId: string): Promise<void>;
  isFavorite(userId: string, articleId: string): Promise<boolean>;
  generateSlug(title: string): Promise<string>;
}

export class MongoStorage implements IStorage {
  // ──── Auth ────
  async createUser(data: RegisterInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await UserModel.create({
      username: data.username,
      email: data.email.toLowerCase(),
      hashedPassword,
      isAdmin: (data as any).isAdmin || false,
      isBanned: false,
    });
    return user.toJSON() as unknown as User;
  }

  async getUserByEmail(email: string): Promise<(User & { hashedPassword: string }) | undefined> {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) return undefined;
    // Return JSON + hashedPassword for verification
    const json = user.toJSON() as any;
    json.hashedPassword = user.get('hashedPassword');
    return json;
  }

  async getUserById(id: string): Promise<User | undefined> {
    if (!isValidObjectId(id)) return undefined;
    const user = await UserModel.findById(id);
    return user ? (user.toJSON() as unknown as User) : undefined;
  }

  async getUsers(): Promise<User[]> {
    const users = await UserModel.find().sort({ createdAt: -1 });
    return users.map(u => u.toJSON()) as unknown as User[];
  }

  async updateUserStatus(id: string, updates: { isAdmin?: boolean, isBanned?: boolean, otpSecret?: string, otpEnabled?: boolean }): Promise<User | undefined> {
    if (!isValidObjectId(id)) return undefined;
    const user = await UserModel.findByIdAndUpdate(id, updates, { new: true });
    return user ? (user.toJSON() as unknown as User) : undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const result = await UserModel.findByIdAndDelete(id);
    return !!result;
  }

  // ──── Articles ────
  async getArticles(params?: SearchParams, userId?: string): Promise<Article[]> {
    let query: any = {};

    if (params?.q) {
      // Use MongoDB text index for efficient full-text search
      // ✅ SECURITY FIX: Sanitize query to prevent NoSQL injection
      const sanitizedQuery = (params.q || "").replace(/[\$\{\}]/g, "").trim().slice(0, 200);
      if (sanitizedQuery) {
        query.$text = { $search: sanitizedQuery };
      }
    }
    if (params?.tag) {
      query.tags = params.tag;
    }

    // Visibility filter: show public articles + user's own private articles
    if (userId) {
      query.$or = [
        { isPublic: true },
        { authorId: new mongoose.Types.ObjectId(userId) },
        { authorId: { $exists: false } },  // legacy articles without author
      ];
    } else {
      // Unauthenticated: only public + authorless articles
      query.$or = [
        { isPublic: true },
        { authorId: { $exists: false } },
      ];
    }

    // Pre-fetch user favorites once (avoids double DB call)
    const favIds = userId ? await this.getUserFavoriteIds(userId) : [];
    const favSet = new Set(favIds);

    // If filtering by favorites, restrict to user's favorite article IDs
    if (params?.favorite === 'true' && userId) {
      query._id = { $in: favIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    const articles = await ArticleModel.find(query)
      .sort({ updatedAt: -1 })
      .skip(((params?.page ?? 1) - 1) * (params?.limit ?? 20))
      .limit(params?.limit ?? 20);
    const articleJsons = articles.map(a => a.toJSON()) as unknown as Article[];

    return articleJsons.map(a => ({ ...a, isFavorite: favSet.has(a.id) }));
  }

  async getArticleBySlug(slug: string, userId?: string): Promise<Article | undefined> {
    const article = await ArticleModel.findOne({ slug });
    if (!article) return undefined;
    return this.getArticle(article._id.toString(), userId);
  }

  async getArticle(id: string, userId?: string): Promise<Article | undefined> {
  if (!isValidObjectId(id)) return undefined;

  const article = await ArticleModel.findById(id);
  if (!article) return undefined;

  const authorId = article.get('authorId')?.toString();
  const isPublic = article.get('isPublic') as boolean;

  // 🔥 Updated access control
 if (!isPublic) {
  if (!userId) {
    throw new Error("AUTH_REQUIRED");
  }

  if (authorId && authorId !== userId) {
    throw new Error("FORBIDDEN");
  }
}

  const json = article.toJSON() as unknown as Article;

  if (userId) {
    json.isFavorite = await this.isFavorite(userId, id);
  } else {
    json.isFavorite = false;
  }

  return json;
}

  async createArticle(insertArticle: InsertArticle, authorId?: string): Promise<Article> {
    const data: any = { ...insertArticle };
    if (data.title) {
      data.title = data.title.trim();
      data.slug = await this.generateSlug(data.title);
    }
    if (authorId) data.authorId = authorId;
    const article = await ArticleModel.create(data);
    // Create initial version
    await VersionModel.create({
      articleId: article._id,
      content: article.content,
      editedBy: authorId || undefined,
      action: 'CREATED',
    });
    const json = article.toJSON() as unknown as Article;
    json.isFavorite = false;
    return json;
  }

  async updateArticle(id: string, updates: Partial<InsertArticle>, userId?: string): Promise<Article | undefined> {
    if (!isValidObjectId(id)) return undefined;
    const data: any = { ...updates };
    if (updates.title) {
      data.title = updates.title.trim();
      data.slug = await this.generateSlug(data.title);
    }
    const article = await ArticleModel.findByIdAndUpdate(id, data, { new: true });
    if (article && updates.content) {
      await VersionModel.create({
        articleId: article._id,
        content: updates.content,
        editedBy: userId || undefined,
        action: 'UPDATED',
      });
    }
    if (!article) return undefined;
    const json = article.toJSON() as unknown as Article;
    if (userId) {
      json.isFavorite = await this.isFavorite(userId, id);
    } else {
      json.isFavorite = false;
    }
    return json;
  }

  async deleteArticle(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const result = await ArticleModel.findByIdAndDelete(id);
    if (!result) return false;
    await VersionModel.deleteMany({ articleId: id });
    await FavoriteModel.deleteMany({ articleId: id });
    return true;
  }

  async getArticleVersions(articleId: string): Promise<ArticleVersion[]> {
    if (!isValidObjectId(articleId)) return [];
    const versions = await VersionModel.find({ articleId }).sort({ createdAt: -1 });
    return versions.map(v => v.toJSON()) as unknown as ArticleVersion[];
  }

  async getAllTags(): Promise<TagCount[]> {
    const result = await ArticleModel.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, tag: '$_id', count: 1 } },
    ]);
    return result as TagCount[];
  }

  async restoreVersion(articleId: string, versionId: string, userId?: string): Promise<Article | undefined> {
    if (!isValidObjectId(articleId) || !isValidObjectId(versionId)) return undefined;
    const version = await VersionModel.findById(versionId);
    if (!version || !version.articleId || version.articleId.toString() !== articleId) return undefined;
    
    const article = await ArticleModel.findByIdAndUpdate(
      articleId,
      { content: version.content },
      { new: true }
    );
    if (article) {
      await VersionModel.create({
        articleId: article._id,
        content: version.content,
        editedBy: userId || undefined,
        action: 'RESTORED',
      });
    }
    if (!article) return undefined;
    const json = article.toJSON() as unknown as Article;
    if (userId) {
      json.isFavorite = await this.isFavorite(userId, articleId);
    } else {
      json.isFavorite = false;
    }
    return json;
  }

  // ──── Wiki-link title resolution ────
  async resolveArticleTitles(titles: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    if (titles.length === 0) return result;

    // Case-insensitive match, tolerant of leading/trailing whitespace in stored titles
    const articles = await ArticleModel.find(
      { title: { $in: titles.map(t => new RegExp(`^\\s*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')) } },
      { _id: 1, title: 1 }
    ).lean();

    // Build a trimmed, lowercase lookup map for matched articles
    const titleToId = new Map<string, string>();
    for (const a of articles) {
      titleToId.set((a.title as string).trim().toLowerCase(), (a._id as any).toString());
    }

    for (const t of titles) {
      result[t] = titleToId.get(t.trim().toLowerCase()) ?? null;
    }
    return result;
  }

  // ──── Favorites ────
  async getUserFavoriteIds(userId: string): Promise<string[]> {
    if (!isValidObjectId(userId)) return [];
    const favs = await FavoriteModel.find({ userId });
    return favs.map(f => f.articleId.toString());
  }

  async addFavorite(userId: string, articleId: string): Promise<void> {
    if (!isValidObjectId(userId) || !isValidObjectId(articleId)) return;
    // upsert to avoid duplicates
    await FavoriteModel.updateOne(
      { userId, articleId },
      { userId, articleId },
      { upsert: true }
    );
  }

  async removeFavorite(userId: string, articleId: string): Promise<void> {
    if (!isValidObjectId(userId) || !isValidObjectId(articleId)) return;
    await FavoriteModel.deleteOne({ userId, articleId });
  }

  async isFavorite(userId: string, articleId: string): Promise<boolean> {
    if (!isValidObjectId(userId) || !isValidObjectId(articleId)) return false;
    const fav = await FavoriteModel.findOne({ userId, articleId });
    return !!fav;
  }

  async generateSlug(title: string): Promise<string> {
    let baseSlug = title
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')     // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-');  // Replace multiple - with single -

    if (!baseSlug) baseSlug = 'article';

    let slug = baseSlug;
    let counter = 1;

    // Ensure uniqueness
    while (await ArticleModel.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}

export const storage = new MongoStorage();
