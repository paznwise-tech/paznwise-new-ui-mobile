import { useQuery } from '@tanstack/react-query';
import { TaxonomyService, type Category } from '@/services/taxonomyService';

// Taxonomy changes rarely and is read by several screens, so it is cached
// for the session rather than refetched per screen.
const LONG_LIVED = { staleTime: 30 * 60_000, gcTime: 60 * 60_000 };

export const ALL_CATEGORY: Category = {
  id: 'all',
  label: 'All',
  slug: '',
  color: '#C9A84C',
};

/** Product categories, with the "All" chip prepended. */
export function useCategories() {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: TaxonomyService.getCategories,
    ...LONG_LIVED,
  });

  return {
    ...query,
    categories: [ALL_CATEGORY, ...(query.data ?? [])],
  };
}

export function useHeroSlides() {
  return useQuery({
    queryKey: ['hero-slides'],
    queryFn: TaxonomyService.getHeroSlides,
    ...LONG_LIVED,
  });
}

export function usePerformerCategories() {
  return useQuery({
    queryKey: ['performer-categories'],
    queryFn: TaxonomyService.getPerformerCategories,
    ...LONG_LIVED,
  });
}
