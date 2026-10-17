import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, RefreshControl } from "react-native";
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
import { CardListSkeleton, CategorySkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import type { CategoryGroup, ExerciseCategory } from "@/types";

const inputClass =
  "rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm";

function GroupPicker({
  groups,
  value,
  onChange,
}: {
  groups: CategoryGroup[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const { t } = useTranslation();
  const options: { id: number | null; name: string }[] = [
    { id: null, name: t("categories.noGroup") },
    ...groups,
  ];
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => (
        <Pressable
          key={String(opt.id)}
          onPress={() => onChange(opt.id)}
          className={`rounded-full px-3 py-1 ${value === opt.id ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-700"}`}
        >
          <Text
            className={`text-xs font-medium ${value === opt.id ? "text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          >
            {opt.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch, isRefetching } = useCategories();
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
  const [newGroupId, setNewGroupId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupRowId, setEditingGroupRowId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createCategory.mutate({ name: trimmed, group_id: newGroupId }, { onSuccess: () => setNewName("") });
  };

  const startEditing = (cat: ExerciseCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingGroupId(cat.group_id);
    setDeleteError(null);
  };

  const handleSave = () => {
    const trimmed = editingName.trim();
    if (!trimmed || editingId === null) return;
    updateCategory.mutate(
      { id: editingId, name: trimmed, group_id: editingGroupId },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const confirmDelete = (id: number) => {
    Alert.alert(t("common.delete"), "Are you sure?", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          setDeleteError(null);
          deleteCategory.mutate(id, {
            onError: (err) => setDeleteError(err instanceof Error ? err.message : t("categories.cannotDelete")),
          });
        },
      },
    ]);
  };

  const confirmDeleteGroup = (group: CategoryGroup) => {
    Alert.alert(t("common.delete"), t("categories.deleteGroupHint"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteGroup.mutate(group.id) },
    ]);
  };

  const handleCreateGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    createGroup.mutate(trimmed, { onSuccess: () => setNewGroupName("") });
  };

  const handleRenameGroup = () => {
    const trimmed = editingGroupName.trim();
    if (!trimmed || editingGroupRowId === null) return;
    renameGroup.mutate({ id: editingGroupRowId, name: trimmed }, { onSuccess: () => setEditingGroupRowId(null) });
  };

  const sections: { key: string; group: CategoryGroup | null; items: ExerciseCategory[] }[] = [
    ...groups.map((g) => ({ key: `g-${g.id}`, group: g, items: categories.filter((c) => c.group_id === g.id) })),
    {
      key: "none",
      group: null,
      items: categories.filter((c) => c.group_id === null || !groups.some((g) => g.id === c.group_id)),
    },
  ].filter((s) => s.group !== null || s.items.length > 0);

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900"
      contentContainerClassName="p-4 pb-10"
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <TextInput
            value={newName}
            onChangeText={setNewName}
            className={`flex-1 ${inputClass}`}
            placeholder={t("categories.newPlaceholder")}
          />
          <Pressable
            onPress={handleCreate}
            disabled={createCategory.isPending || !newName.trim()}
            className="rounded-md bg-blue-600 px-4 py-2"
          >
            <Text className="text-sm font-medium text-white">
              {createCategory.isPending ? t("common.adding") : t("common.add")}
            </Text>
          </Pressable>
        </View>
        {groups.length > 0 && <GroupPicker groups={groups} value={newGroupId} onChange={setNewGroupId} />}
      </View>

      {isLoading && <CardListSkeleton count={4} Card={CategorySkeleton} />}
      {error && <Text className="mt-6 text-red-600 dark:text-red-400">Failed to load categories.</Text>}
      {deleteError && <Text className="mt-3 text-sm text-red-600 dark:text-red-400">{deleteError}</Text>}
      {!isLoading && !error && categories.length === 0 && (
        <Text className="mt-6 text-gray-500 dark:text-gray-400">{t("categories.empty")}</Text>
      )}

      <View className="mt-6 gap-6">
        {sections.map((section) => (
          <View key={section.key}>
            <View className="mb-2 flex-row items-center justify-between gap-2">
              {section.group && editingGroupRowId === section.group.id ? (
                <View className="flex-1 flex-row items-center gap-2">
                  <TextInput
                    value={editingGroupName}
                    onChangeText={setEditingGroupName}
                    autoFocus
                    className={`flex-1 ${inputClass}`}
                  />
                  <Pressable onPress={handleRenameGroup} disabled={renameGroup.isPending} className="rounded-md bg-blue-600 px-3 py-1.5">
                    <Text className="text-xs font-medium text-white">{t("common.save")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEditingGroupRowId(null)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{t("common.cancel")}</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                    {section.group ? section.group.name : t("categories.noGroup")}
                  </Text>
                  {section.group && (
                    <View className="flex-row items-center gap-2">
                      <Pressable
                        onPress={() => {
                          setEditingGroupRowId(section.group!.id);
                          setEditingGroupName(section.group!.name);
                        }}
                        className="px-2 py-1"
                      >
                        <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{t("categories.rename")}</Text>
                      </Pressable>
                      <Pressable onPress={() => confirmDeleteGroup(section.group!)} className="px-2 py-1">
                        <Text className="text-xs font-medium text-red-600 dark:text-red-400">{t("common.delete")}</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </View>

            <View className="gap-2">
              {section.items.map((cat) => (
                <View
                  key={cat.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
                >
                  {editingId === cat.id ? (
                    <View className="gap-2">
                      <TextInput
                        value={editingName}
                        onChangeText={setEditingName}
                        autoFocus
                        className={inputClass}
                      />
                      {groups.length > 0 && (
                        <GroupPicker groups={groups} value={editingGroupId} onChange={setEditingGroupId} />
                      )}
                      <View className="flex-row gap-2">
                        <Pressable onPress={handleSave} disabled={updateCategory.isPending} className="rounded-md bg-blue-600 px-3 py-1.5">
                          <Text className="text-xs font-medium text-white">{t("common.save")}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setEditingId(null)}
                          className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5"
                        >
                          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{t("common.cancel")}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-gray-900 dark:text-gray-100">{cat.name}</Text>
                      <View className="flex-row items-center gap-2">
                        <Pressable onPress={() => startEditing(cat)} className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5">
                          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{t("categories.rename")}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => confirmDelete(cat.id)}
                          disabled={deleteCategory.isPending}
                          className="rounded-md px-3 py-1.5"
                        >
                          <Text className="text-xs font-medium text-red-600 dark:text-red-400">{t("common.delete")}</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <Text className="mt-10 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
        {t("categories.groups")}
      </Text>
      <View className="mt-2 flex-row items-center gap-2">
        <TextInput
          value={newGroupName}
          onChangeText={setNewGroupName}
          className={`flex-1 ${inputClass}`}
          placeholder={t("categories.newGroup")}
        />
        <Pressable
          onPress={handleCreateGroup}
          disabled={createGroup.isPending || !newGroupName.trim()}
          className="rounded-md bg-blue-600 px-4 py-2"
        >
          <Text className="text-sm font-medium text-white">{t("common.add")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
