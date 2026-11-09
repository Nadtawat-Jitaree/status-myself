import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const baseUrl = "https://notes.puanj.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ─── Static pages ────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },

    // Auth
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/auth/sign-up`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/auth/forgot-password`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },

    // System (authenticated — lower priority for crawlers)
    {
      url: `${baseUrl}/system/dashboard`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/system/notes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/system/notes/normal`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/system/notes/school`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/system/projects`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/system/calendar`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/system/qualities`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // ─── Dynamic: shared notes & categories ─────────────────────────
  try {
    const supabase = await createClient();

    const [{ data: sharedNotes }, { data: sharedCategories }] =
      await Promise.all([
        supabase
          .from("notes")
          .select("share_token, updated_at")
          .eq("is_shared", true)
          .not("share_token", "is", null),
        supabase
          .from("note_categories")
          .select("share_token, created_at")
          .eq("is_shared", true)
          .not("share_token", "is", null),
      ]);

    const sharedNoteRoutes: MetadataRoute.Sitemap = (sharedNotes ?? []).map(
      (n) => ({
        url: `${baseUrl}/share/note/${n.share_token}`,
        lastModified: new Date(n.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }),
    );

    const sharedCategoryRoutes: MetadataRoute.Sitemap = (
      sharedCategories ?? []
    ).map((c) => ({
      url: `${baseUrl}/share/category/${c.share_token}`,
      lastModified: new Date(c.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...sharedNoteRoutes, ...sharedCategoryRoutes];
  } catch {
    // หาก Supabase ไม่พร้อม ให้ fallback เป็น static routes เท่านั้น
    return staticRoutes;
  }
}
