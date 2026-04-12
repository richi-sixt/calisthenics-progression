"use client";

import { useState } from "react";
import {
  useCategories,
  useCreateCategory,
  useRenameCategory,
  useDeleteCategory,
} from "@/hooks/use-categories";
import PageHeader from "@/components/ui/page-header";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";

export default function CategoriesPage() {
  const { data, isLoading, error } = useCategories();
  const categories = data?.data ?? [];

  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const deleteCategory = useDeleteCategory();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    createCategory.mutate(trimmed, {
      onSuccess: () => setNewName(""),
    });
  };

  const startEditing = (id: number, name: string) => {
    setEditingId(id);
    setEditingName(name);
    setDeleteError(null);
  };

  const handleRename = () => {
    const trimmed = editingName.trim();
    if (!trimmed || editingId === null) return;
    renameCategory.mutate(
      { id: editingId, name: trimmed },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const handleDelete = (id: number) => {
    setDeleteError(null);
    deleteCategory.mutate(id, {
      onError: (err) => {
        setDeleteError(
          err instanceof Error ? err.message : "Cannot delete: category is in use."
        );
      },
    });
  };

  return (
    <div>
      <PageHeader title="Categories" />

      {/* Create new category */}
      <form onSubmit={handleCreate} className="mt-4 flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="New category name"
        />
        <button
          type="submit"
          disabled={createCategory.isPending || !newName.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createCategory.isPending ? "Adding..." : "Add"}
        </button>
      </form>

      {isLoading && <Loading text="Loading categories..." />}
      {error && <ErrorMessage error={error} />}

      {deleteError && (
        <p className="mt-3 text-sm text-red-600">{deleteError}</p>
      )}

      {!isLoading && !error && categories.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">
          No categories yet. Create one above.
        </p>
      )}

      {categories.length > 0 && (
        <div className="mt-4 space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              {editingId === cat.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRename}
                    disabled={renameCategory.isPending}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm text-gray-900">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(cat.id, cat.name)}
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      disabled={deleteCategory.isPending}
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
