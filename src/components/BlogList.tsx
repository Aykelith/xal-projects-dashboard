import { useState, useEffect, useCallback } from 'react';
import type { PostData } from '../types';
import BlogPostCard from './BlogPostCard';

interface Props {
  posts: PostData[];
}

type SortKey = 'published_at' | 'updated_at';

const PAGE_SIZE = 10;

function getUrlState() {
  const p = new URLSearchParams(window.location.search);
  const sort = (p.get('sort') ?? 'published_at') as SortKey;
  const q = p.get('q') ?? '';
  const page = Math.max(1, parseInt(p.get('page') ?? '1', 10) || 1);
  return { sort, q, page };
}

export default function BlogList({ posts }: Props) {
  const [sort, setSort] = useState<SortKey>('published_at');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const state = getUrlState();
    setSort(state.sort);
    setQuery(state.q);
    setPage(state.page);
    setHydrated(true);
  }, []);

  const pushUrl = useCallback(
    (nextSort: SortKey, nextQuery: string, nextPage: number) => {
      const p = new URLSearchParams();
      if (nextSort !== 'published_at') p.set('sort', nextSort);
      if (nextQuery) p.set('q', nextQuery);
      if (nextPage > 1) p.set('page', String(nextPage));
      const qs = p.toString();
      history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    },
    []
  );

  const handleSort = (key: SortKey) => {
    setSort(key);
    setPage(1);
    pushUrl(key, query, 1);
  };

  const handleQuery = (q: string) => {
    setQuery(q);
    setPage(1);
    pushUrl(sort, q, 1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    pushUrl(sort, query, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtered = posts
    .filter((p) =>
      query ? p.title.toLowerCase().includes(query.toLowerCase()) : true
    )
    .sort((a, b) => {
      const aDate = sort === 'updated_at' ? (a.updated_at ?? a.published_at) : a.published_at;
      const bDate = sort === 'updated_at' ? (b.updated_at ?? b.published_at) : b.published_at;
      return bDate.localeCompare(aDate);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (!hydrated) {
    return (
      <div>
        {posts
          .sort((a, b) => b.published_at.localeCompare(a.published_at))
          .slice(0, PAGE_SIZE)
          .map((p) => (
            <BlogPostCard key={p.id} post={p} />
          ))}
      </div>
    );
  }

  return (
    <div>
      <div className="controls">
        <div className="controls-group">
          <span className="controls-label">Sort by</span>
          <div className="sort-buttons">
            <button
              className={`btn${sort === 'published_at' ? ' active' : ''}`}
              onClick={() => handleSort('published_at')}
            >
              Published
            </button>
            <button
              className={`btn${sort === 'updated_at' ? ' active' : ''}`}
              onClick={() => handleSort('updated_at')}
            >
              Updated
            </button>
          </div>
        </div>

        <div className="controls-group">
          <span className="controls-label">Search</span>
          <input
            type="search"
            className="search-input"
            placeholder="Search by title…"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
          />
        </div>
      </div>

      {paginated.length === 0 ? (
        <div className="empty-state">
          <p>No posts found.</p>
        </div>
      ) : (
        paginated.map((p) => <BlogPostCard key={p.id} post={p} />)
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => handlePage(safePage - 1)}
            disabled={safePage <= 1}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`page-btn${n === safePage ? ' active' : ''}`}
              onClick={() => handlePage(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="page-btn"
            onClick={() => handlePage(safePage + 1)}
            disabled={safePage >= totalPages}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
