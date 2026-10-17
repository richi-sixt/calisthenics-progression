"use client";

import { useState } from "react";
import {
  useCategories,
  useCategoryGroups,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateCategoryGroup,
  useRenameCategoryGroup,
  useDeleteCategoryGroup,
} from "@/hooks/use-categories";
import PageHeader from "@/components/ui/page-header";
import ErrorMessage from "@/components/ui/error-message";
import { useTranslation } from "@/i18n";
import { CardListSkeleton, CategorySkeleton } from "@/components/ui/skeleton";
import type { ExerciseCategory } from "@/types";

const inputClass =
  "rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useCategories();
  const { data: groupData } = useCategoryGroups();
  const categories = data?.data ?? [];
  const groups = groupData?.data ?? [];

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createGroup = useCreateCategoryGroup();
  const renameGroup = useRenameCategoryGroup();
  const deleteGroup = useDeleteCategoryGroup();

  const [newName, setNewName] = useState("");
  const [newGroupId, setNewGroupId] = useState<number | "">("");
  const [newGroupName, setNewGroupName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | "">("");
  const [editingGroupRowId, setEditingGroupRowId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    createCategory.mutate(
      { name: trimmed, group_id: newGroupId === "" ? null : newGroupId },
      { onSuccess: () => setNewName("") }
    );
  };

  const startEditing = (cat: ExerciseCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingGroupId(cat.group_id ?? "");
    setDeleteError(null);
  };

  const handleSave = () => {
    const trimmed = editingName.trim();
    if (!trimmed || editingId === null) return;
    updateCategory.mutate(
      {
        id: editingId,
        name: trimmed,
        group_id: editingGroupId === "" ? null : editingGroupId,
      },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const handleDelete = (id: number) => {
    setDeleteError(null);
    deleteCategory.mutate(id, {
      onError: (err) => {
        setDeleteError(
          err instanceof Error ? err.message : t("categories.cannotDelete")
        );
      },
    });
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    createGroup.mutate(trimmed, { onSuccess: () => setNewGroupName("") });
  };

  const handleRenameGroup = () => {
    const trimmed = editingGroupName.trim();
    if (!trimmed || editingGroupRowId === null) return;
    renameGroup.mutate(
      { id: editingGroupRowId, name: trimmed },
      { onSuccess: () => setEditingGroupRowId(null) }
    );
  };

  const sections = [
    ...groups.map((g) => ({
      key: g.id as number | "none",
      group: g,
      items: categories.filter((c) => c.group_id === g.id),
    })),
    {
      key: "none" as const,
      group: null,
      items: categories.filter(
        (c) => c.group_id === null || !groups.some((g) => g.id === c.group_id)
      ),
    },
  ].filter((s) => s.group !== null || s.items.length > 0);

  return (
    <div>
      <PageHeader title={t("categories.title")} />

      {/* Create new category */}
      <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={`min-w-0 flex-1 ${inputClass}`}
          placeholder={t("categories.newPlaceholder")}
        />
        <select
          value={newGroupId}
          onChange={(e) =>
            setNewGroupId(e.target.value === "" ? "" : Number(e.target.value))
          }
          aria-label={t("categories.groupLabel")}
          className={inputClass}
        >
          <option value="">{t("categories.noGroup")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={createCategory.isPending || !newName.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createCategory.isPending ? t("common.adding") : t("common.add")}
        </button>
      </form>

      {isLoading && <CardListSkeleton count={4} Card={CategorySkeleton} />}
      {error && <ErrorMessage error={error} />}

      {deleteError && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
      )}

      {!isLoading && !error && categories.length === 0 && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          {t("categories.empty")}
        </p>
      )}

      <div className="mt-6 space-y-6">
        {sections.map((section) => (
          <section key={section.key}>
            <div className="mb-2 flex items-center justify-between gap-2">
              {section.group && editingGroupRowId === section.group.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    className={`flex-1 ${inputClass}`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameGroup();
                      if (e.key === "Escape") setEditingGroupRowId(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRenameGroup}
                    disabled={renameGroup.isPending}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {t("common.save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGroupRowId(null)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {section.group ? section.group.name : t("categories.noGroup")}
                  </h2>
                  {section.group && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGroupRowId(section.group!.id);
                          setEditingGroupName(section.group!.name);
                        }}
                        className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t("categories.rename")}
                      </button>
                      <button
                        type="button"
                        title={t("categories.deleteGroupHint")}
                        onClick={() => deleteGroup.mutate(section.group!.id)}
                        disabled={deleteGroup.isPending}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              {section.items.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
                >
                  {editingId === cat.id ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className={`min-w-0 flex-1 ${inputClass}`}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <select
                        value={editingGroupId}
                        onChange={(e) =>
                          setEditingGroupId(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        aria-label={t("categories.groupLabel")}
                        className={inputClass}
                      >
                        <option value="">{t("categories.noGroup")}</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={updateCategory.isPending}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {t("common.save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(cat)}
                          className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          {t("categories.rename")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id)}
                          disabled={deleteCategory.isPending}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          {t("common.delete")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Create new group */}
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {t("categories.groups")}
      </h2>
      <form onSubmit={handleCreateGroup} className="mt-2 flex items-center gap-2">
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          className={`min-w-0 flex-1 ${inputClass}`}
          placeholder={t("categories.newGroup")}
        />
        <button
          type="submit"
          disabled={createGroup.isPending || !newGroupName.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {t("common.add")}
        </button>
      </form>
    </div>
  );
}
