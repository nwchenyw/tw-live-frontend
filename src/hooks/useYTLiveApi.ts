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

  return {
    loading,
    error,
    fetchVideos,
    addVideo,
    deleteVideo,
    fetchStatus,
    checkHealth,
  };
};
