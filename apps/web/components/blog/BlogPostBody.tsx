'use client';

import { useLayoutEffect, useRef } from 'react';
import 'highlight.js/styles/github.min.css';

const COPY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

type Props = {
  html: string;
  className?: string;
};

export function BlogPostBody({ html, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    root.querySelectorAll('pre:not([data-fw-code-enhanced])').forEach((pre) => {
      pre.setAttribute('data-fw-code-enhanced', 'true');

      const wrap = document.createElement('div');
      wrap.className = 'fw-code-block not-prose';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fw-code-copy';
      btn.setAttribute('aria-label', 'Copy code');
      btn.innerHTML = COPY_SVG;

      const resetIcon = () => {
        btn.innerHTML = COPY_SVG;
        btn.setAttribute('aria-label', 'Copy code');
      };

      btn.addEventListener('click', async () => {
        const text = pre.textContent ?? '';
        try {
          await navigator.clipboard.writeText(text);
          btn.innerHTML = CHECK_SVG;
          btn.setAttribute('aria-label', 'Copied');
          window.setTimeout(resetIcon, 2000);
        } catch {
          btn.setAttribute('aria-label', 'Copy failed');
          window.setTimeout(resetIcon, 2000);
        }
      });

      pre.parentNode?.insertBefore(wrap, pre);
      wrap.appendChild(btn);
      wrap.appendChild(pre);
    });
  }, [html]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
