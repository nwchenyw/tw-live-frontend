import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { AddMonitorForm } from "@/components/AddMonitorForm";
import { MonitorList, MonitorItem } from "@/components/MonitorList";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useYTLiveApi, StatusItem } from "@/hooks/useYTLiveApi";
import { getStoredAvatar, saveAvatarUrlToStorage } from "@/components/SettingsDialog";

const withCacheBust = (url: string) => {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${Date.now()}`;
};

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const { fetchVideos, fetchStatus, addVideo, deleteVideo, checkHealth, getAvatarUrl } = useYTLiveApi();
  
  const [monitors, setMonitors] = useState<MonitorItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [statusFilter, setStatusFilter] = useState("all");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState("30");
  const [isConnected, setIsConnected] = useState(false);
  const [healthStats, setHealthStats] = useState({ watching: 0, cached: 0 });
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // 載入使用者頭像：優先從後端 API 撈，沒有再用 localStorage
  useEffect(() => {
    const loadAvatar = async () => {
      if (!user?.id) return;
      
      try {
        // 1. 先嘗試從後端 API 獲取頭像
        const serverAvatar = await getAvatarUrl(user.id);
        if (serverAvatar) {
          // 同步到 localStorage
          saveAvatarUrlToStorage(user.id, serverAvatar);
          setAvatarUrl(withCacheBust(serverAvatar));
          return;
        }
      } catch (err) {
        console.warn("Failed to fetch avatar from server:", err);
      }
      
      // 2. 後端沒有，fallback 到 localStorage
      const storedAvatar = getStoredAvatar(user.id);
      if (storedAvatar) {
        setAvatarUrl(withCacheBust(storedAvatar));
      }
    };
    
    loadAvatar();
  }, [user?.id, getAvatarUrl]);

  // Load videos and status from Python backend
  const loadData = useCallback(async () => {
    try {
      const [videos, statuses, health] = await Promise.all([
        fetchVideos(),
        fetchStatus(),
        checkHealth(),
      ]);

      setIsConnected(health.ok);
      setHealthStats({ watching: health.watching, cached: health.cached });

      // Create a map of video_id -> status
      const statusMap = new Map<string, StatusItem>();
      statuses.forEach((s) => statusMap.set(s.video_id, s));

      // Merge videos with their status
      const monitorItems: MonitorItem[] = videos.map((v, index) => {
        const status = statusMap.get(v.video_id);
        const liveStatus = status?.live_status?.toUpperCase();
        
        let monitorStatus: "live" | "offline" | "error" = "offline";
        if (status?.is_live_now) {
          monitorStatus = "live";
        } else if (status?.note && status.note.includes("error")) {
          monitorStatus = "error";
        }

        return {
          id: `video-${v.video_id}-${index}`,
          videoId: v.video_id,
          name: v.name || undefined,
          thumbnail: `https://i.ytimg.com/vi/${v.video_id}/mqdefault.jpg`,
          status: monitorStatus,
          details: liveStatus || status?.note || "尚未檢測",
          checkTime: status?.checked_at
            ? new Date(status.checked_at).toLocaleString("zh-TW")
            : "尚未檢測",
        };
      });

      setMonitors(monitorItems);
      setLastUpdate(
        new Date().toLocaleString("zh-TW", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    } catch (err) {
      console.error("Failed to load data:", err);
      setIsConnected(false);
      toast({
        variant: "destructive",
        title: "連線失敗",
        description: "無法連線到後端伺服器，請確認 Python 後端已啟動",
      });
    }
  }, [fetchVideos, fetchStatus, checkHealth, toast]);

  // Initial load
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated, loadData]);

  // Auto refresh
  useEffect(() => {
    const interval = parseInt(autoRefreshInterval);
    if (interval <= 0 || !isAuthenticated) return;

    const timer = setInterval(loadData, interval * 1000);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, isAuthenticated, loadData]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }
  
  const filteredMonitors = monitors.filter(m => {
    if (statusFilter === "all") return true;
    return m.status === statusFilter;
  });

  const paginatedMonitors = filteredMonitors.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAddMonitor = async (videoId: string, name?: string) => {
    try {
      const result = await addVideo(videoId, name);
      toast({
        title: "新增成功",
        description: `已新增監控: ${name || result.video_id}`,
      });
      // Reload data to get the updated list
      await loadData();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "新增失敗",
        description: err instanceof Error ? err.message : "無法新增監控",
      });
    }
  };

  const handleDeleteMonitor = async (id: string) => {
    // Extract videoId from the id (format: video-{videoId}-{index})
    const parts = id.split("-");
    const videoId = parts.slice(1, -1).join("-"); // Handle video IDs with dashes

    try {
      await deleteVideo(videoId);
      toast({
        title: "刪除成功",
        description: "已移除監控項目",
      });
      // Reload data to get the updated list
      await loadData();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "刪除失敗",
        description: err instanceof Error ? err.message : "無法刪除監控",
      });
    }
  };

  const handleManualRefresh = () => {
    loadData();
    toast({
      title: "正在刷新",
      description: "手動刷新監控列表...",
    });
  };

  const handleWatch = (videoId: string) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  const handleLogout = () => {
    signOut();
    toast({
      title: "登出成功",
      description: "您已成功登出",
    });
    navigate("/login");
  };

  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url ? withCacheBust(url) : undefined);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const liveCount = monitors.filter(m => m.status === "live").length;
  const offlineCount = monitors.filter(m => m.status === "offline").length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        watchingCount={healthStats.watching}
        cachedCount={healthStats.cached}
        onliveCount={liveCount}
        offliveCount={offlineCount}
        isConnected={isConnected}
        username={user?.username || "User"}
        userId={user?.id || ""}
        avatarUrl={avatarUrl}
        onLogout={handleLogout}
        onAvatarChange={handleAvatarChange}
      />
      
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto flex gap-6">
          <div className="w-[360px] flex-shrink-0">
            <AddMonitorForm
              onAdd={handleAddMonitor}
              onManualRefresh={handleManualRefresh}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              autoRefreshInterval={autoRefreshInterval}
              onAutoRefreshIntervalChange={setAutoRefreshInterval}
              currentRefreshInterval={parseInt(autoRefreshInterval) || 30}
            />
          </div>
          
          <MonitorList
            items={paginatedMonitors}
            totalItems={filteredMonitors.length}
            currentPage={currentPage}
            pageSize={pageSize}
            lastUpdate={lastUpdate}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onDelete={handleDeleteMonitor}
            onWatch={handleWatch}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
