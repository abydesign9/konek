import { query } from "@/lib/db";

// Small CMS: content pages edited in admin, rendered publicly. Section body is
// plain text (bullets via "- ", paragraphs via blank lines) so there is no HTML
// injection surface.
export interface ContentSection {
  label: string;
  heading: string;
  body: string;
}
export interface ContentPage {
  slug: string;
  title: string;
  subtitle: string | null;
  sections: ContentSection[];
  published: boolean;
  updatedAt: string;
}

interface Row {
  slug: string;
  title: string;
  subtitle: string | null;
  sections: ContentSection[];
  published: boolean;
  updated_at: string;
}

function toPage(r: Row): ContentPage {
  return {
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle,
    sections: Array.isArray(r.sections) ? r.sections : [],
    published: r.published,
    updatedAt: r.updated_at,
  };
}

export async function getContentPage(slug: string, includeUnpublished = false): Promise<ContentPage | null> {
  const { rows } = await query<Row>(
    `SELECT slug, title, subtitle, sections, published, updated_at FROM content_pages WHERE slug = $1`,
    [slug]
  );
  const r = rows[0];
  if (!r || (!r.published && !includeUnpublished)) return null;
  return toPage(r);
}

// Sanitise the sections shape before storing — strings only, no stray fields.
export function normaliseSections(input: unknown): ContentSection[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      label: String(s.label ?? "").slice(0, 80),
      heading: String(s.heading ?? "").slice(0, 160),
      body: String(s.body ?? "").slice(0, 6000),
    }));
}

export async function updateContentPage(
  slug: string,
  patch: { title?: string; subtitle?: string | null; sections?: ContentSection[]; published?: boolean },
  adminUserId: string
): Promise<ContentPage> {
  const sets: string[] = [];
  const vals: unknown[] = [slug];
  if (typeof patch.title === "string") {
    vals.push(patch.title.slice(0, 200));
    sets.push(`title = $${vals.length}`);
  }
  if ("subtitle" in patch) {
    vals.push(patch.subtitle ? String(patch.subtitle).slice(0, 400) : null);
    sets.push(`subtitle = $${vals.length}`);
  }
  if (patch.sections) {
    vals.push(JSON.stringify(patch.sections));
    sets.push(`sections = $${vals.length}::jsonb`);
  }
  if (typeof patch.published === "boolean") {
    vals.push(patch.published);
    sets.push(`published = $${vals.length}`);
  }
  vals.push(adminUserId);
  sets.push(`updated_by = $${vals.length}`, `updated_at = now()`);

  const { rows } = await query<Row>(
    `UPDATE content_pages SET ${sets.join(", ")} WHERE slug = $1
     RETURNING slug, title, subtitle, sections, published, updated_at`,
    vals
  );
  return toPage(rows[0]);
}
