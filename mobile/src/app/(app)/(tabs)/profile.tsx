import { useState } from "react";
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useProfile } from "@/hooks/use-profile";
import { useUpdateProfile, useUploadProfilePicture, useDeleteAccount } from "@/hooks/use-update-profile";
import { supabase } from "@/lib/supabase/client";

const API_BASE = process.env.EXPO_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export default function ProfileScreen() {
  const { data, isLoading, error } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadPicture = useUploadProfilePicture();
  const deleteAccount = useDeleteAccount();

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [email, setEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900"><ActivityIndicator /></View>;
  }
  if (error || !data) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 p-4"><Text className="text-red-600 dark:text-red-400">Failed to load profile.</Text></View>;
  }

  const user = data.data;
  const profilePicUrl =
    user.image_file && user.image_file !== "default.jpg"
      ? `${API_BASE}/static/profile_pics/${user.image_file}`
      : null;

  const startEditing = () => {
    setUsername(user.username);
    setAboutMe(user.about_me ?? "");
    setEmail(user.email);
    setEmailMessage(null);
    setEditing(true);
  };

  const handleSave = async () => {
    setEmailMessage(null);

    if (email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) {
        setEmailMessage({ type: "error", text: emailError.message });
        return;
      }
      setEmailMessage({ type: "success", text: "Check your new email to confirm the change." });
    }

    updateProfile.mutate(
      { username, about_me: aboutMe },
      { onSuccess: () => { if (email === user.email) setEditing(false); } }
    );
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append("picture", blob, asset.fileName ?? "photo.jpg");

      uploadPicture.mutate(formData, {
        onError: (error) => {
          Alert.alert("Upload failed", error instanceof Error ? error.message : String(error));
        },
      });
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : String(error));
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords don't match." });
      return;
    }

    setPasswordPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMessage({ type: "error", text: error.message });
      } else {
        setPasswordMessage({ type: "success", text: "Password changed." });
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setPasswordPending(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteAccount.mutate(undefined, { onSuccess: () => supabase.auth.signOut() });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top"]}>
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="py-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Profile</Text>

        <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <View className="flex-row items-center gap-4">
            <View>
              {profilePicUrl ? (
                <Image source={{ uri: profilePicUrl }} className="h-20 w-20 rounded-full" />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
                  <Text className="text-2xl font-bold text-gray-500 dark:text-gray-400">{user.username?.[0]?.toUpperCase() ?? "?"}</Text>
                </View>
              )}
              <Pressable onPress={handlePickImage} disabled={uploadPicture.isPending} className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 p-2">
                <Text className="text-xs text-white">✎</Text>
              </Pressable>
            </View>
            <View>
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">{user.username}</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">{user.email}</Text>
            </View>
          </View>

          {!editing ? (
            <>
              <View className="mt-6 gap-4">
                <View>
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">About me</Text>
                  <Text className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.about_me || "Not set"}</Text>
                </View>
                <View>
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Stats</Text>
                  <Text className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.follower_count} followers · {user.following_count} following</Text>
                </View>
                {user.registered_on && (
                  <View>
                    <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Member since</Text>
                    <Text className="mt-1 text-sm text-gray-900 dark:text-gray-100">{new Date(user.registered_on).toLocaleDateString()}</Text>
                  </View>
                )}
              </View>
              <View className="mt-6 flex-row gap-3">
                <Pressable onPress={startEditing} className="rounded-md bg-blue-600 px-4 py-2">
                  <Text className="text-sm font-medium text-white">Edit profile</Text>
                </Pressable>
                <Pressable onPress={() => supabase.auth.signOut()} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Sign out</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View className="mt-6 gap-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</Text>
                <TextInput value={username} onChangeText={setUsername} className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm" />
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Text>
                <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm" />
                {email !== user.email && <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">You&apos;ll need to confirm this change via email.</Text>}
                {emailMessage && (
                  <Text className={`mt-1 text-xs ${emailMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{emailMessage.text}</Text>
                )}
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">About me</Text>
                <TextInput value={aboutMe} onChangeText={setAboutMe} multiline numberOfLines={3} className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm" />
              </View>
              <View className="flex-row gap-3">
                <Pressable onPress={handleSave} disabled={updateProfile.isPending} className="rounded-md bg-blue-600 px-4 py-2">
                  <Text className="text-sm font-medium text-white">{updateProfile.isPending ? "Saving..." : "Save"}</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(false)} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <View className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Change password</Text>
          {!showPassword ? (
            <Pressable onPress={() => setShowPassword(true)} className="mt-3 self-start rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Change password</Text>
            </Pressable>
          ) : (
            <View className="mt-4 gap-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">New password</Text>
                <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="At least 6 characters" className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm" />
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm password</Text>
                <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm" />
              </View>
              {passwordMessage && (
                <Text className={`text-sm ${passwordMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{passwordMessage.text}</Text>
              )}
              <View className="flex-row gap-3">
                <Pressable onPress={handleChangePassword} disabled={passwordPending} className="rounded-md bg-blue-600 px-4 py-2">
                  <Text className="text-sm font-medium text-white">{passwordPending ? "Changing..." : "Change password"}</Text>
                </Pressable>
                <Pressable onPress={() => { setShowPassword(false); setNewPassword(""); setConfirmPassword(""); setPasswordMessage(null); }} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <View className="mt-6 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 p-4">
          <Text className="text-lg font-semibold text-red-600 dark:text-red-400">Danger zone</Text>
          <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">Permanently delete your account and all your data.</Text>
          <Pressable onPress={confirmDeleteAccount} disabled={deleteAccount.isPending} className="mt-4 self-start rounded-md border border-red-300 dark:border-red-700 px-4 py-2">
            <Text className="text-sm font-medium text-red-600 dark:text-red-400">{deleteAccount.isPending ? "Deleting..." : "Delete account"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
