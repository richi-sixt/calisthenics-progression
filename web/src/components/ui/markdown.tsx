import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Element -> Tailwind class mapping. There is no typography plugin in this
 * project, so every element the renderer can emit is styled explicitly.
 * Raw HTML in the source is never rendered (react-markdown's default), and
 * unsafe URLs (javascript: etc.) are stripped by its default urlTransform.
 */
const components: Components = {
  h1: ({ children }) => <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">{children}</h2>,
  h2: ({ children }) => <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">{children}</h4>,
  h4: ({ children }) => <h5 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">{children}</h5>,
  h5: ({ children }) => <h6 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">{children}</h6>,
  h6: ({ children }) => <h6 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">{children}</h6>,
  p: ({ children }) => <p className="mt-2 first:mt-0">{children}</p>,
  // Unsafe URLs arrive here with an empty href; render just the text then.
  a: ({ href, children }) => !href ? <>{children}</> : (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="mt-2 border-l-4 border-gray-300 pl-3 italic dark:border-gray-600">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm dark:bg-gray-800">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mt-2 overflow-x-auto rounded-md bg-gray-100 p-3 text-sm dark:bg-gray-800 [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-4 border-gray-200 dark:border-gray-700" />,
  table: ({ children }) => (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b px-2 py-1 text-left font-medium dark:border-gray-700">{children}</th>,
  td: ({ children }) => <td className="border-b px-2 py-1 dark:border-gray-700">{children}</td>,
  // Images are shown as a link for now: inline rendering of arbitrary external
  // URLs would let any author track who views their (public) exercise.
  img: ({ src, alt }) =>
    typeof src === "string" && src ? (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        🖼 {alt || src}
      </a>
    ) : null,
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`break-words ${className ?? ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
