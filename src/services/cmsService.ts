import { fetchApi } from './api';

/**
 * CMS pages — `GET /cms/:slug`, public.
 *
 * Backs the legal and policy screens, so their text is edited in the admin
 * panel and stays in step with the web app instead of being duplicated in
 * the bundle.
 */

export interface CmsPage {
  slug: string;
  title: string;
  /** HTML from the CMS editor. */
  content: string;
  updatedAt?: string;
}

/** Slugs the web app publishes; keep in step with paznwise-new-ui. */
export const CMS_SLUGS = {
  privacy: 'privacy-policy',
  terms: 'terms-conditions',
  buyerProtection: 'buyer-protection',
  dataDeletion: 'data-deletion',
  helpCenter: 'help-center',
} as const;

export const CmsService = {
  async getPage(slug: string): Promise<CmsPage> {
    const res = await fetchApi<any>(`/cms/${slug}`, { requiresAuth: false });
    const d = res?.data ?? res?.page ?? res;
    return {
      slug: d?.slug ?? slug,
      title: d?.title ?? d?.name ?? '',
      content: d?.content ?? d?.body ?? d?.html ?? '',
      updatedAt: d?.updatedAt,
    };
  },
};
