import { useState } from "react";
import { View, Text, Pressable, Modal, FlatList, TextInput } from "react-native";
import { useTranslation } from "@/i18n";

export interface PickerItem {
  id: string;
  label: string;
}

/** A "select a value" field that opens a searchable, full-screen list modal
 * on tap -- the mobile equivalent of a `<select>`, following the same
 * Modal+FlatList pattern already used by WorkoutForm's exercise picker. */
export function ListPickerField({
  label,
  placeholder,
  value,
  items,
  onChange,
  searchable = false,
  searchPlaceholder,
  emptyText,
  testID,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  items: PickerItem[];
  onChange: (id: string | null) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = items.find((item) => item.id === value);
  const query = search.trim().toLowerCase();
  const filtered =
    searchable && query
      ? items.filter((item) => item.label.toLowerCase().includes(query))
      : items;

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <View>
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        testID={testID}
        className="mt-1 flex-row items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5"
      >
        <Text
          numberOfLines={1}
          className={`flex-1 text-sm ${
            selected ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Text className="ml-2 text-gray-400 dark:text-gray-500">▾</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <View className="flex-1 bg-white dark:bg-gray-900 pt-4">
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {label}
            </Text>
            <Pressable onPress={close} testID={testID ? `${testID}-close` : undefined}>
              <Text className="text-sm text-blue-600 dark:text-blue-400">
                {t("common.cancel")}
              </Text>
            </Pressable>
          </View>
          {searchable && (
            <TextInput
              className="mx-4 mb-3 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm"
              placeholder={searchPlaceholder}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          )}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item.id === "" ? null : item.id);
                  close();
                }}
                testID={testID ? `${testID}-option-${item.id}` : undefined}
                className="border-b border-gray-100 dark:border-gray-800 px-4 py-3"
              >
                <Text
                  className={`text-sm ${
                    item.id === value
                      ? "font-semibold text-blue-600 dark:text-blue-400"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              emptyText ? (
                <Text className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                  {emptyText}
                </Text>
              ) : undefined
            }
          />
        </View>
      </Modal>
    </View>
  );
}
