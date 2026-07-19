import { createMemo, type Component } from "solid-js";
import { marked } from "marked";

/**
 * Renders trusted (admin-authored) markdown. When community contributions
 * arrive (future scope), add an HTML sanitizer (e.g. DOMPurify) here before
 * rendering untrusted content.
 */
export const Markdown: Component<{ source: string }> = props => {
  const html = createMemo(() => marked.parse(props.source, { async: false }));
  return <div class="md" innerHTML={html()} />;
};
