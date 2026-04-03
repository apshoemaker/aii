/**
 * Markdown to HTML converter using `marked`.
 * Configured for chat-style output: compact, no raw HTML passthrough.
 */
import { marked } from 'marked';

marked.setOptions({
  breaks: true,       // Single newlines become <br>
  gfm: true,          // GitHub-flavored markdown (tables, strikethrough, etc.)
});

export function markdownToHtml(md) {
  return marked.parse(md);
}
