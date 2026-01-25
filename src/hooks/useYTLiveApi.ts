import { useState, useCallback } from "react";

// Configure this to your Python backend URL
const API_BASE_URL = "http://localhost:8000";

export interface VideoItem {
  video_id: string;
  name?: string;
}

export interface StatusItem {
  video_id: string;
  is_live_now: boolean;
  live_status?: string;
  checked_at: string;
  note?: string;
}

export interface HealthStatus {
  ok: boolean;
  watching: number;
  cached: number;
}

export const useYTLiveApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GET /videos - List all monitored videos
  const fetchVideos = useCallback(async (): Promise<VideoItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/videos`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch videos";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // POST /videos - Add a new video to monitor
  const addVideo = useCallback(async (watchUrl: string, name?: string): Promise<VideoItem> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/videos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          watch_url: watchUrl,
          name: name || undefined,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add video";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // DELETE /videos/{video_id} - Remove a video
  const deleteVideo = useCallback(async (videoId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete video";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // GET /status - Get live status of all videos
  const fetchStatus = useCallback(async (): Promise<StatusItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch status";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // GET /healthz - Health check
  const checkHealth = useCallback(async (): Promise<HealthStatus> => {
    try {
      const response = await fetch(`${API_BASE_URL}/healthz`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      return { ok: false, watching: 0, cached: 0 };
    }
  }, []);

  // POST /avatar - Upload avatar
  const uploadAvatar = useCallback(async (userId: string, file: File): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/avatar`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      // Return full URL
      return `${API_BASE_URL}${data.avatar_url}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload avatar";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // GET /avatar/{user_id} - Get user avatar URL
  const getAvatarUrl = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/avatar/${userId}`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      if (data.avatar_url) {
        return `${API_BASE_URL}${data.avatar_url}`;
      }
      return null;
    } catch (err) {
      return null;
    }
  }, []);

  return {
    loading,
    error,
    fetchVideos,
    addVideo,
    deleteVideo,
    fetchStatus,
    checkHealth,
    uploadAvatar,
    getAvatarUrl,
  };
};
