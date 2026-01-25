import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { AddMonitorForm } from "@/components/AddMonitorForm";
import { MonitorList, MonitorItem } from "@/components/MonitorList";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Mock data for demonstration
const generateMockData = (): MonitorItem[] => {
  const mockItems: MonitorItem[] = [];
  const baseTime = new Date();
  
  for (let i = 0; i < 323; i++) {
    const time = new Date(baseTime.getTime() - i * 1000);
    mockItems.push({
      id: `item-${i}`,
      videoId: `${['ByNEL0Ton4', 'egDiYN-P7A', 'FwTmj0nxGQ', 'tLjNNPdw1Q', 'JhoMGoAFFc'][i % 5]}`,
      name: i % 3 === 0 ? undefined : `Channel ${i + 1}`,
      thumbnail: `https://i.ytimg.com/vi/${['ByNEL0Ton4', 'egDiYN-P7A', 'FwTmj0nxGQ', 'tLjNNPdw1Q', 'JhoMGoAFFc'][i % 5]}/mqdefault.jpg`,
      status: i % 10 === 0 ? "offline" : "live",
      details: "尚未檢測",
      checkTime: `${time.getFullYear()}/${time.getMonth() + 1}/${time.getDate()} 下午${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`,
    });
  }
  
  return mockItems;
};

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { loading, isAuthenticated, signOut } = useAuth();
  const [monitors, setMonitors] = useState<MonitorItem[]>(generateMockData);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [statusFilter, setStatusFilter] = useState("all");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState("30");

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  // Show loading while checking auth
  if (loading) {
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

  const handleAddMonitor = (videoId: string, name?: string) => {
    const newMonitor: MonitorItem = {
      id: `item-${Date.now()}`,
      videoId: videoId.replace(/.*(?:v=|\/v\/|youtu\.be\/|embed\/)([^#&?]*).*/, '$1').substring(0, 11),
      name,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      status: "live",
      details: "尚未檢測",
      checkTime: new Date().toLocaleString('zh-TW'),
    };
    
    setMonitors(prev => [newMonitor, ...prev]);
    toast({
      title: "新增成功",
      description: `已新增監控: ${name || videoId}`,
    });
  };

  const handleDeleteMonitor = (id: string) => {
    setMonitors(prev => prev.filter(m => m.id !== id));
    toast({
      title: "刪除成功",
      description: "已移除監控項目",
    });
  };

  const handleManualRefresh = () => {
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const lastUpdate = new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const liveCount = monitors.filter(m => m.status === "live").length;
  const offlineCount = monitors.filter(m => m.status === "offline").length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        watchingCount={liveCount}
        cachedCount={monitors.length}
        onliveCount={liveCount}
        offliveCount={offlineCount}
        isConnected={true}
        onLogout={handleLogout}
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
