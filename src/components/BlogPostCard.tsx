import type { PostData } from '../types';
import { formatDate } from '../utils/date';

interface Props {
  post: PostData;
}

export default function BlogPostCard({ post }: Props) {
  const displayDate = post.updated_at ?? post.published_at;

  return (
    <article className="blog-card">
      <div className="blog-card-header">
        <h2 className="blog-card-title">
          <a href={`/blog/${post.project_id}/${post.id}`}>{post.title}</a>
        </h2>
      </div>

      <div className="blog-card-meta">
        <a href={`/projects/${post.project_id}`} className="blog-card-project">
          {post.project_title}
        </a>
        <span>{formatDate(post.published_at)}</span>
        {post.updated_at && <span>(updated {formatDate(post.updated_at)})</span>}
      </div>

      {post.tags.length > 0 && (
        <div className="blog-card-tags">
          {post.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
    </article>
  );
}
