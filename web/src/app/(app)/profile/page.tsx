"use client";

import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useUpdateProfile } from "@/hooks/use-update-profile";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";

export default function ProfilePage() {
  const router = useRouter();
  const { data, isLoading, error } = useProfile();
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [aboutMe, setAboutMe] = useState("");

  if (isLoading) return <Loading text="Loading profile..." />;
  if (error || !data) return <ErrorMessage error={error} />;

  const user = data.data;

  const startEditing = () => {
    setUsername(user.username);
    setAboutMe(user.about_me ?? "");
    setEditing(true);
  };

  const handleSave = () => {
    updateProfile.mutate(
      { username, about_me: aboutMe },
      { onSuccess: () => setEditing(false) }
    );
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        {!editing ? (
          <>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.username}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">About me</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.about_me || <span className="text-gray-400">Not set</span>}
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
                  <dt className="text-sm font-medium text-gray-500">Member since</dt>
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">About me</label>
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
    </div>
  );
}
