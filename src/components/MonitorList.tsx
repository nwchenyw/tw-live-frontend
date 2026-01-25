import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ExternalLink, Trash2 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export interface MonitorItem {
  id: string;
  videoId: string;
  name?: string;
  thumbnail: string;
  status: "live" | "offline" | "error";
  details: string;
  checkTime: string;
}

interface MonitorListProps {
  items: MonitorItem[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  lastUpdate: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDelete: (id: string) => void;
  onWatch: (videoId: string) => void;
}

export const MonitorList = ({
  items,
  totalItems,
  currentPage,
  pageSize,
  lastUpdate,
  onPageChange,
  onPageSizeChange,
  onDelete,
  onWatch,
}: MonitorListProps) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <Card className="flex-1">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-foreground">
          監控列表 / 狀態
        </CardTitle>
        <span className="text-sm text-muted-foreground">
          last: {lastUpdate}
        </span>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[120px]">縮圖</TableHead>
                <TableHead>名稱 / Video ID</TableHead>
                <TableHead className="w-[80px]">狀態</TableHead>
                <TableHead className="w-[100px]">詳細</TableHead>
                <TableHead className="w-[150px]">檢查時間</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="p-2">
                    <div className="w-[100px]">
                      <AspectRatio ratio={16 / 9}>
                        <img
                          src={item.thumbnail}
                          alt={item.name || item.videoId}
                          className="rounded object-cover w-full h-full bg-muted"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                      </AspectRatio>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[hsl(var(--primary))]">
                        {item.name || `_${item.videoId}`}
                      </p>
                      <button
                        onClick={() => onWatch(item.videoId)}
                        className="text-sm text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                      >
                        watch
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        item.status === "live" 
                          ? "bg-[hsl(var(--live))] animate-pulse" 
                          : item.status === "offline"
                          ? "bg-muted-foreground"
                          : "bg-[hsl(var(--warning))]"
                      }`} />
                      <span className={`text-sm font-medium ${
                        item.status === "live" 
                          ? "text-[hsl(var(--live))]" 
                          : "text-muted-foreground"
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      <p>{item.status === "live" ? "LIVE" : item.status.toUpperCase()}</p>
                      <p>{item.details}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {item.checkTime}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(item.id)}
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      刪除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            顯示第 {startItem} - {endItem} 項，共 {totalItems} 項
          </p>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">每頁</span>
              <Select 
                value={pageSize.toString()} 
                onValueChange={(v) => onPageSizeChange(Number(v))}
              >
                <SelectTrigger className="w-[80px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 項</SelectItem>
                  <SelectItem value="10">10 項</SelectItem>
                  <SelectItem value="20">20 項</SelectItem>
                  <SelectItem value="50">50 項</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                上一頁
              </Button>
              
              <div className="flex items-center gap-1 px-2">
                <span className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded text-sm font-medium">
                  {currentPage}
                </span>
                <span className="text-sm text-muted-foreground">/ {totalPages}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                下一頁
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
