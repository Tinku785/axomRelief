export const PAGE_SIZE = 10;

export function pageSlice(items, page) {
  return items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
}

// First, last, and a window around the current page; gaps become "…". At ten
// rows a page a busy day runs past thirty pages, and a row of thirty buttons
// is not navigation.
export function pageWindow(page, pages, span = 1) {
  const wanted = new Set([0, pages - 1]);
  for (let i = page - span; i <= page + span; i++) {
    if (i >= 0 && i < pages) wanted.add(i);
  }
  const sorted = [...wanted].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}
