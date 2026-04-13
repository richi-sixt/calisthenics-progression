export default function Loading({ text = "Loading..." }: { text?: string }) {
  return <p className="mt-6 text-gray-500 dark:text-gray-400">{text}</p>;
}
