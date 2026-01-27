import { useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// 頭像靜態檔案的 base URL
const AVATAR_STATIC_BASE = "https://twbackend.nwchenyw.com/static/users";

export interface AvatarDbResult {
  success: boolean;
  filename: string | null;
  error?: string;
}

export const useAvatarDb = () => {
  // 從 MySQL DB 取得用戶頭像檔名
  const getAvatarFilename = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/avatars?user_id=${encodeURIComponent(userId)}`,
        {
          method: "GET",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to get avatar from DB:", response.status);
        return null;
      }

      const data: AvatarDbResult = await response.json();
      return data.filename;
    } catch (error) {
      console.error("Error fetching avatar from DB:", error);
      return null;
    }
  }, []);

  // 取得完整的頭像 URL
  const getAvatarUrl = useCallback(async (userId: string): Promise<string | null> => {
    const filename = await getAvatarFilename(userId);
    if (!filename) return null;
    return `${AVATAR_STATIC_BASE}/${filename}`;
  }, [getAvatarFilename]);

  // 儲存頭像檔名到 MySQL DB
  const saveAvatarFilename = useCallback(async (userId: string, filename: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/avatars`,
        {
          method: "POST",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: userId, filename }),
        }
      );

      if (!response.ok) {
        console.error("Failed to save avatar to DB:", response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error saving avatar to DB:", error);
      return false;
    }
  }, []);

  // 從 MySQL DB 刪除頭像記錄
  const deleteAvatarFromDb = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/avatars`,
        {
          method: "DELETE",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );

      if (!response.ok) {
        console.error("Failed to delete avatar from DB:", response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error deleting avatar from DB:", error);
      return false;
    }
  }, []);

  return {
    getAvatarFilename,
    getAvatarUrl,
    saveAvatarFilename,
    deleteAvatarFromDb,
  };
};
