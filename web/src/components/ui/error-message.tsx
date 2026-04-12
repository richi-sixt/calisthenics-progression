export default function ErrorMessage({ error }: { error: Error | unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="mt-6 text-red-600">
      <p>Something went wrong.</p>
      <p className="mt-1 text-sm text-red-400">{message}</p>
    </div>
  );
}
