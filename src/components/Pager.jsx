import { PAGE_SIZE, pageSlice, pageWindow } from '../utils/paging';

// Re-exported so call sites keep importing paging helpers from the component
// they render. The logic lives in a .js file so the selfcheck can import it -
// node cannot load .jsx.
export { PAGE_SIZE, pageSlice, pageWindow };

export default function Pager({ total, page, onPage }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages < 2) return null;

  return (
    <div className="pager">
      <button
        type="button"
        className="pager__step"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
      >
        ‹ Prev
      </button>
      {pageWindow(page, pages).map((n, i) => (
        n === 'gap'
          // eslint-disable-next-line react/no-array-index-key
          ? <span key={`gap${i}`} className="pager__gap">…</span>
          : (
            <button
              key={n}
              type="button"
              className={`pager__num ${n === page ? 'active' : ''}`}
              onClick={() => onPage(n)}
            >
              {n + 1}
            </button>
          )
      ))}
      <button
        type="button"
        className="pager__step"
        disabled={page >= pages - 1}
        onClick={() => onPage(page + 1)}
      >
        Next ›
      </button>
    </div>
  );
}
