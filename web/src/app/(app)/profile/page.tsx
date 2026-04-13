"use client";

import { useRef, useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import {
  useUpdateProfile,
  useUploadProfilePicture,
  useDeleteAccount,
} from "@/hooks/use-update-profile";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export default function ProfilePage() {
  const router = useRouter();
  const { data, isLoading, error } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadPicture = useUploadProfilePicture();
  const deleteAccount = useDeleteAccount();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [email, setEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Change password state
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) return <Loading text="Loading profile..." />;
  if (error || !data) return <ErrorMessage error={error} />;

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

    // Update email via Supabase if changed
    if (email !== user.email) {
      const supabase = createClient();
      const { error: emailError } = await supabase.auth.updateUser({
        email,
      });
      if (emailError) {
        setEmailMessage({ type: "error", text: emailError.message });
        return;
      }
      setEmailMessage({
        type: "success",
        text: "Confirmation email sent to your new address. Please check your inbox.",
      });
    }

    // Update username + about_me via Flask API
    updateProfile.mutate(
      { username, about_me: aboutMe },
      {
        onSuccess: () => {
          if (email === user.email) setEditing(false);
        },
      }
    );
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPicture.mutate(file);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Password must be at least 6 characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Passwords do not match.",
      });
      return;
    }

    setPasswordPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        setPasswordMessage({ type: "error", text: error.message });
      } else {
        setPasswordMessage({
          type: "success",
          text: "Password changed successfully.",
        });
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setPasswordPending(false);
    }
  };

  const handleDeleteAccount = async () => {
    const supabase = createClient();
    deleteAccount.mutate(undefined, {
      onSuccess: async () => {
        await supabase.auth.signOut();
        router.push("/login");
      },
    });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Profile details */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        {/* Profile picture + username header */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {profilePicUrl ? (
              <img
                src={profilePicUrl}
                alt={user.username}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold text-gray-500">
                {user.username?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadPicture.isPending}
              className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 p-1.5 text-white shadow hover:bg-blue-700 disabled:opacity-50"
              title="Change picture"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePictureChange}
              className="hidden"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.username}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        {!editing ? (
          <>
            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">About me</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.about_me || (
                    <span className="text-gray-400">Not set</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Stats</dt>
                <dd className="mt-1 flex gap-4 text-sm text-gray-900">
                  <span>{user.follower_count} followers</span>
                  <span>{user.following_count} following</span>
                </dd>
              </div>
              {user.registered_on && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Member since
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(user.registered_on).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-6 flex gap-3">
              <button
                onClick={startEditing}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              {email !== user.email && (
                <p className="mt-1 text-xs text-gray-500">
                  A confirmation email will be sent to your new address.
                </p>
              )}
              {emailMessage && (
                <p
                  className={`mt-1 text-xs ${
                    emailMessage.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {emailMessage.text}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                About me
              </label>
              <textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateProfile.isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>

        {!showPassword ? (
          <button
            onClick={() => setShowPassword(true)}
            className="mt-3 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Change Password
          </button>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Min. 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Repeat new password"
              />
            </div>
            {passwordMessage && (
              <p
                className={`text-sm ${
                  passwordMessage.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {passwordMessage.text}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleChangePassword}
                disabled={passwordPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {passwordPending ? "Changing..." : "Change Password"}
              </button>
              <button
                onClick={() => {
                  setShowPassword(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordMessage(null);
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="mt-6 rounded-lg border border-red-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
        <p className="mt-1 text-sm text-gray-600">
          Permanently delete your account. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete Account
          </button>
        ) : (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Are you sure? All your workouts, exercises, templates, messages,
              and followers will be permanently deleted.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteAccount.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteAccount.isPending
                  ? "Deleting..."
                  : "Yes, Delete My Account"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
