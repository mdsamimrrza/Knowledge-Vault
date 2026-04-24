import { z } from 'zod';
import {
  insertArticleSchema, articleSchema, articleVersionSchema,
  searchParamsSchema, tagCountSchema,
  registerSchema, loginSchema, userSchema,
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  // ──── Auth ────
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: registerSchema,
      responses: {
        201: userSchema,
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: userSchema,
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: userSchema,
        401: errorSchemas.unauthorized,
      },
    },
  },

  // ──── Articles ────
  articles: {
    list: {
      method: 'GET' as const,
      path: '/api/articles' as const,
      input: searchParamsSchema,
      responses: {
        200: z.array(articleSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/articles/:id' as const,
      responses: {
        200: articleSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/articles' as const,
      input: insertArticleSchema,
      responses: {
        201: articleSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/articles/:id' as const,
      input: insertArticleSchema.partial(),
      responses: {
        200: articleSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/articles/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },

  // ──── Favorites (per-user) ────
  favorites: {
    list: {
      method: 'GET' as const,
      path: '/api/favorites' as const,
      responses: {
        200: z.array(z.string()), // array of article IDs
        401: errorSchemas.unauthorized,
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/favorites/:articleId' as const,
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/favorites/:articleId' as const,
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
  },

  // ──── Tags ────
  tags: {
    list: {
      method: 'GET' as const,
      path: '/api/tags' as const,
      responses: {
        200: z.array(tagCountSchema),
      },
    },
  },

  // ──── Wiki Links (resolve [[Title]] → article ID) ────
  wikiLinks: {
    resolve: {
      method: 'POST' as const,
      path: '/api/articles/resolve-titles' as const,
      input: z.object({ titles: z.array(z.string().min(1)).max(50) }),
      responses: {
        200: z.record(z.string(), z.string().nullable()), // title → id | null
      },
    },
  },

  // ──── Versions ────
  versions: {
    list: {
      method: 'GET' as const,
      path: '/api/articles/:id/versions' as const,
      responses: {
        200: z.array(articleVersionSchema),
        404: errorSchemas.notFound,
      },
    },
    restore: {
      method: 'POST' as const,
      path: '/api/articles/:id/versions/:versionId/restore' as const,
      responses: {
        200: articleSchema,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
