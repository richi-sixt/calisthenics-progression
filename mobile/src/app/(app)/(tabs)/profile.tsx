import { useState } from "react";
import { View, Text, TextInput, Pressable, Image, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useProfile } from "@/hooks/use-profile";
import { useUpdateProfile, useUploadProfilePicture, useDeleteAccount } from "@/hooks/use-update-profile";
import { supabase } from "@/lib/supabase/client";
import { ProfileSkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";

const API_BASE = process.env.EXPO_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export default function ProfileScreen() {
  const { t, locale, setLocale, formatDate } = useTranslation();
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
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top"]}>
        <View className="px-4 pt-4">
          <ProfileSkeleton />
        </View>
      </SafeAreaView>
    );
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
      setEmailMessage({ type: "success", text: t("profile.emailConfirmNote") });
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
      setPasswordMessage({ type: "error", text: t("profile.passwordTooShort") });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: t("profile.passwordMismatch") });
      return;
    }

    setPasswordPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMessage({ type: "error", text: error.message });
      } else {
        setPasswordMessage({ type: "success", text: t("profile.passwordChanged") });
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setPasswordPending(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      t("profile.deleteAccount"),
      t("profile.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.deleteConfirmButton"),
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
        <View className="flex-row items-center justify-between py-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("profile.title")}</Text>
          <View className="flex-row rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
            <Pressable
              onPress={() => setLocale("en")}
              className={`px-3 py-1.5 ${locale === "en" ? "bg-blue-600" : "bg-transparent"}`}
            >
              <Text className={`text-xs font-medium ${locale === "en" ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>EN</Text>
            </Pressable>
            <Pressable
              onPress={() => setLocale("de")}
              className={`px-3 py-1.5 ${locale === "de" ? "bg-blue-600" : "bg-transparent"}`}
            >
              <Text className={`text-xs font-medium ${locale === "de" ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>DE</Text>
            </Pressable>
          </View>
        </View>

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
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("profile.aboutMe")}</Text>
                  <Text className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.about_me || t("profile.notSet")}</Text>
                </View>
                <View>
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("profile.stats")}</Text>
                  <Text className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.follower_count} {t("profile.followers")} · {user.following_count} {t("profile.following")}</Text>
                </View>
                {user.registered_on && (
                  <View>
                    <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("profile.memberSince")}</Text>
                    <Text className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatDate(user.registered_on)}</Text>
                  </View>
                )}
              </View>
              <View className="mt-6 flex-row gap-3">
                <Pressable onPress={startEditing} className="rounded-md bg-blue-600 px-4 py-2">
                  <Text className="text-sm font-medium text-white">{t("profile.editProfile")}</Text>
                </Pressable>
                <Pressable onPress={() => supabase.auth.signOut()} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("profile.signOut")}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View className="mt-6 gap-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("profile.username")}</Text>
                <TextInput value={username} onChangeText={setUsername} className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm" />
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("profile.email")}</Text>
                <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm" />
                {email !== user.email && <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("profile.emailConfirmNote")}</Text>}
                {emailMessage && (
                  <Text className={`mt-1 text-xs ${emailMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{emailMessage.text}</Text>
                )}
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("profile.aboutMe")}</Text>
                <TextInput value={aboutMe} onChangeText={setAboutMe} multiline numberOfLines={3} className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm" />
              </View>
              <View className="flex-row gap-3">
                <Pressable onPress={handleSave} disabled={updateProfile.isPending} className="rounded-md bg-blue-600 px-4 py-2">
                  <Text className="text-sm font-medium text-white">{updateProfile.isPending ? t("common.saving") : t("common.save")}</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(false)} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("common.cancel")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <View className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("profile.changePassword")}</Text>
          {!showPassword ? (
            <Pressable onPress={() => setShowPassword(true)} className="mt-3 self-start rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("profile.changePassword")}</Text>
            </Pressable>
          ) : (
            <View className="mt-4 gap-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("profile.newPassword")}</Text>
                <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder={t("profile.minChars")} className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm" />
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("profile.confirmPassword")}</Text>
                <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm" />
              </View>
              {passwordMessage && (
                <Text className={`text-sm ${passwordMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{passwordMessage.text}</Text>
              )}
              <View className="flex-row gap-3">
                <Pressable onPress={handleChangePassword} disabled={passwordPending} className="rounded-md bg-blue-600 px-4 py-2">
                  <Text className="text-sm font-medium text-white">{passwordPending ? t("profile.changing") : t("profile.changePassword")}</Text>
                </Pressable>
                <Pressable onPress={() => { setShowPassword(false); setNewPassword(""); setConfirmPassword(""); setPasswordMessage(null); }} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("common.cancel")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <View className="mt-6 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 p-4">
          <Text className="text-lg font-semibold text-red-600 dark:text-red-400">{t("profile.dangerZone")}</Text>
          <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("profile.dangerDescription")}</Text>
          <Pressable onPress={confirmDeleteAccount} disabled={deleteAccount.isPending} className="mt-4 self-start rounded-md border border-red-300 dark:border-red-700 px-4 py-2">
            <Text className="text-sm font-medium text-red-600 dark:text-red-400">{deleteAccount.isPending ? t("profile.deleting") : t("profile.deleteAccount")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
