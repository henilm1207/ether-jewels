import { apiUrl } from '../config';

// Builds the header/menu tree from live DB categories (cached 5 min).
// Variants = parent 'Collection'; sub-types = parent matching variant name.
// Aliases and shape collections are excluded (they are not browsable shelves).
let cache = null;
let cacheAt = 0;
const TTL = 5 * 60 * 1000;

export async function getMenuTree() {
  const now = Date.now();
  if (cache && now - cacheAt < TTL) return cache;
  const res = await fetch(apiUrl('/api/categories'));
  if (!res.ok) throw new Error('Could not load collections');
  const cats = await res.json();
  const variants = cats
    .filter((c) => c.parent === 'Collection' && !c.aliasOf && !c.shape)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const tree = variants.map((v) => ({
    label: v.name,
    to: `/collections/${v.key}`,
    children: cats
      .filter((c) => c.parent === v.name && !c.aliasOf && !c.shape && c.key !== v.key)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((c) => ({ label: c.name, to: `/collections/${c.key}` })),
  }));
  // A variant with no children still links to its own collection page.
  cache = tree;
  cacheAt = now;
  return tree;
}

export function clearMenuCache() {
  cache = null;
  cacheAt = 0;
}
