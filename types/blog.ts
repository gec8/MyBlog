export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readMinutes: number;
  content: string;
  coverImage?: string;
  coverThumbnail?: string;
  coverCredit?: string;
  coverCreditUrl?: string;
  coverPosition?: string;
  coverBrightness?: number;
  coverOverlay?: number;
  coverPexelsId?: number;
};

export type SiteSettings = {
  name: string;
  tagline: string;
  description: string;
  author: string;
  defaultCategory: string;
  postsPerPage: number;
  github: string;
  footer: string;
  copyright: string;
};

export type Draft = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author: string;
  coverImage: string;
  coverCredit: string;
  coverCreditUrl: string;
  coverPosition: string;
  coverBrightness: number;
  coverOverlay: number;
  coverPexelsId?: number;
  content: string;
};

export type SavedDraft = { id: string; savedAt: string; draft: Draft };

export type RepoMedia = {
  name: string;
  path: string;
  sha: string;
  url: string;
  size: number;
  type: 'image' | 'audio';
};

export type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  role: 'owner' | 'editor' | 'author';
  enabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type ArticleReview = {
  id: string;
  articleId: string | null;
  title: string;
  slug: string;
  post: Post;
  baseSha: string | null;
  status: 'pending' | 'approved' | 'rejected';
  authorName: string;
  note: string | null;
  createdAt: string;
};

export type ContentSnapshot = {
  id: string;
  kind: 'article' | 'settings';
  target_id: string | null;
  title: string;
  created_at: string;
  actor_name: string | null;
};
