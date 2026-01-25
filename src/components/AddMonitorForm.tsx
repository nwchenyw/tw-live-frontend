import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, RefreshCw } from "lucide-react";

interface AddMonitorFormProps {
  onAdd: (videoId: string, name?: string) => void;
  onManualRefresh: () => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  autoRefreshInterval: string;
  onAutoRefreshIntervalChange: (value: string) => void;
  currentRefreshInterval: number;
}

export const AddMonitorForm = ({
  onAdd,
  onManualRefresh,
  statusFilter,
  onStatusFilterChange,
  autoRefreshInterval,
  onAutoRefreshIntervalChange,
  currentRefreshInterval,
}: AddMonitorFormProps) => {
  const [videoId, setVideoId] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (videoId.trim()) {
      onAdd(videoId.trim(), name.trim() || undefined);
      setVideoId("");
      setName("");
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">新增監控</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="videoId" className="text-sm text-foreground">
              Video ID 或 Watch URL
            </Label>
            <Input
              id="videoId"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="dQw4w9WgXcQ 或 https://www.youtube.com/v"
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              會自動解析成 video_id（11 碼）
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-foreground">
              名稱（選填）
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="頻道名稱 / 備註"
              className="bg-background"
            />
          </div>

          <Button type="submit" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            新增
          </Button>
        </form>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={onManualRefresh}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          手動刷新
        </Button>

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">狀態篩選</Label>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="flex-1 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部顯示</SelectItem>
                  <SelectItem value="live">LIVE</SelectItem>
                  <SelectItem value="offline">離線</SelectItem>
                  <SelectItem value="error">錯誤</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="default">
                套用篩選
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">前端自動刷新</Label>
            <div className="flex gap-2">
              <Select value={autoRefreshInterval} onValueChange={onAutoRefreshIntervalChange}>
                <SelectTrigger className="flex-1 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">每 10 秒</SelectItem>
                  <SelectItem value="30">每 30 秒</SelectItem>
                  <SelectItem value="60">每 60 秒</SelectItem>
                  <SelectItem value="0">停用</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="default">
                套用
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              目前畫面刷新：每 {currentRefreshInterval} 秒
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-[hsl(var(--warning)/0.1)] rounded-md border border-[hsl(var(--warning)/0.3)]">
            <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              後端輪詢頻率由 config.json 控制（前端刷新只影響畫面）
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
