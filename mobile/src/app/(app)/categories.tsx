import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, FlatList, Alert, RefreshControl } from "react-native";
import {
  useCategories,
  useCreateCategory,
  useRenameCategory,
  useDeleteCategory,
} from "@/hooks/use-categories";
import type { ExerciseCategory } from "@/types";

export default function CategoriesScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useCategories();
  const categories = data?.data ?? [];

  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const deleteCategory = useDeleteCategory();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createCategory.mutate(trimmed, { onSuccess: () => setNewName("") });
  };

  const startEditing = (id: number, name: string) => {
    setEditingId(id);
    setEditingName(name);
    setDeleteError(null);
  };

  const handleRename = () => {
    const trimmed = editingName.trim();
    if (!trimmed || editingId === null) return;
    renameCategory.mutate({ id: editingId, name: trimmed }, { onSuccess: () => setEditingId(null) });
  };

  const confirmDelete = (id: number) => {
    Alert.alert("Delete category", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setDeleteError(null);
          deleteCategory.mutate(id, {
            onError: (err) => setDeleteError(err instanceof Error ? err.message : "Could not delete category"),
          });
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-white p-4">
      <View className="flex-row items-center gap-2">
        <TextInput
          value={newName}
          onChangeText={setNewName}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="New category name"
        />
        <Pressable
          onPress={handleCreate}
          disabled={createCategory.isPending || !newName.trim()}
          className="rounded-md bg-blue-600 px-4 py-2"
        >
          <Text className="text-sm font-medium text-white">
            {createCategory.isPending ? "Adding..." : "Add"}
          </Text>
        </Pressable>
      </View>

      {isLoading && <ActivityIndicator className="mt-6" />}
      {error && <Text className="mt-6 text-red-600">Failed to load categories.</Text>}
      {deleteError && <Text className="mt-3 text-sm text-red-600">{deleteError}</Text>}
      {!isLoading && !error && categories.length === 0 && (
        <Text className="mt-6 text-gray-500">No categories yet.</Text>
      )}

      <FlatList
        className="mt-4 flex-1"
        data={categories}
        keyExtractor={(item: ExerciseCategory) => String(item.id)}
        ItemSeparatorComponent={() => <View className="h-2" />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        renderItem={({ item: cat }) => (
          <View className="flex-row items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            {editingId === cat.id ? (
              <View className="flex-1 flex-row items-center gap-2">
                <TextInput
                  value={editingName}
                  onChangeText={setEditingName}
                  autoFocus
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                />
                <Pressable
                  onPress={handleRename}
                  disabled={renameCategory.isPending}
                  className="rounded-md bg-blue-600 px-3 py-1.5"
                >
                  <Text className="text-xs font-medium text-white">Save</Text>
                </Pressable>
                <Pressable
                  onPress={() => setEditingId(null)}
                  className="rounded-md border border-gray-300 px-3 py-1.5"
                >
                  <Text className="text-xs font-medium text-gray-600">Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text className="text-sm text-gray-900">{cat.name}</Text>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => startEditing(cat.id, cat.name)}
                    className="rounded-md bg-gray-100 px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-gray-600">Rename</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDelete(cat.id)}
                    disabled={deleteCategory.isPending}
                    className="rounded-md px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-red-600">Delete</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}
