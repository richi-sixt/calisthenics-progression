import { View, Text, Pressable } from "react-native";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          testID={testID ? `${testID}-${opt.value}` : undefined}
          className={`rounded-md px-3 py-1.5 ${
            value === opt.value ? "bg-gray-900 dark:bg-gray-100" : "bg-gray-100 dark:bg-gray-700"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              value === opt.value
                ? "text-white dark:text-gray-900"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
