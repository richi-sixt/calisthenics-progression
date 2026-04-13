export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-8 text-center">
      <p className="text-lg font-medium text-gray-600 dark:text-gray-400">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
