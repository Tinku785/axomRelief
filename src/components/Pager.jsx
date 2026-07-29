export const PAGE_SIZE = 3;

export function pageSlice(items, page) {
  return items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
}

// ponytail: every page number is a button. Lists here are tens of rows, not
// thousands — add ellipsis truncation if one ever runs past ~15 pages.
export default function Pager({ total, page, onPage }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages < 2) return null;

  return (
    <div className="pager">
      <button type="button" className="pager__step" disabled={page === 0} onClick={() => onPage(page - 1)}>‹</button>
      {Array.from({ length: pages }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`pager__num ${i === page ? 'active' : ''}`}
          onClick={() => onPage(i)}
        >
          {i + 1}
        </button>
      ))}
      <button type="button" className="pager__step" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>›</button>
    </div>
  );
}
