import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";

// localStorage key for avatar
const getAvatarStorageKey = (userId: string) => `avatar_${userId}`;

// 從 localStorage 讀取頭像
export const getStoredAvatar = (userId: string): string | null => {
  try {
    return localStorage.getItem(getAvatarStorageKey(userId));
  } catch {
    return null;
  }
};

// 儲存頭像到 localStorage
const saveAvatarToStorage = (userId: string, base64: string): void => {
  try {
    localStorage.setItem(getAvatarStorageKey(userId), base64);
  } catch (e) {
    console.error("無法儲存頭像到 localStorage:", e);
    throw new Error("儲存空間不足，請嘗試使用較小的圖片");
  }
};

// 從 localStorage 刪除頭像
const removeAvatarFromStorage = (userId: string): void => {
  try {
    localStorage.removeItem(getAvatarStorageKey(userId));
  } catch {
    // ignore
  }
};

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  userId: string;
  currentAvatarUrl?: string;
  onAvatarChange: (url: string) => void;
}

export const SettingsDialog = ({
  open,
  onOpenChange,
  username,
  userId,
  currentAvatarUrl,
  onAvatarChange,
}: SettingsDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Avatar state
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentAvatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 當 dialog 開啟時，從 localStorage 讀取頭像
  useEffect(() => {
    if (open && userId) {
      const storedAvatar = getStoredAvatar(userId);
      if (storedAvatar) {
        setPreviewUrl(storedAvatar);
      } else {
        setPreviewUrl(currentAvatarUrl);
      }
    }
  }, [open, userId, currentAvatarUrl]);

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "錯誤",
        description: "請選擇圖片檔案",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 500KB for localStorage)
    if (file.size > 500 * 1024) {
      toast({
        title: "錯誤",
        description: "圖片大小不能超過 500KB（localStorage 限制）",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        try {
          // Save to localStorage
          saveAvatarToStorage(userId, base64);
          setPreviewUrl(base64);
          onAvatarChange(base64);
          
          toast({
            title: "成功",
            description: "頭像已儲存到本地",
          });
        } catch (error) {
          toast({
            title: "儲存失敗",
            description: error instanceof Error ? error.message : "無法儲存頭像",
            variant: "destructive",
          });
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      reader.onerror = () => {
        toast({
          title: "讀取失敗",
          description: "無法讀取圖片檔案",
          variant: "destructive",
        });
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "錯誤",
        description: "處理圖片時發生錯誤",
        variant: "destructive",
      });
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    removeAvatarFromStorage(userId);
    setPreviewUrl(undefined);
    onAvatarChange("");
    toast({
      title: "成功",
      description: "頭像已移除",
    });
  };

  const handlePasswordChange = async () => {
    // Validate passwords
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "錯誤",
        description: "請填寫所有欄位",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "錯誤",
        description: "新密碼與確認密碼不符",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 4) {
      toast({
        title: "錯誤",
        description: "新密碼至少需要 4 個字元",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      // 呼叫 Python 後端更改密碼 API
      const API_BASE_URL = "http://localhost:8000";
      const response = await fetch(`${API_BASE_URL}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "錯誤",
          description: data.error || "更改密碼失敗",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "成功",
        description: "密碼已更改",
      });

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "錯誤",
        description: "網路錯誤，請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="avatar" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="avatar">頭像</TabsTrigger>
            <TabsTrigger value="password">更改密碼</TabsTrigger>
          </TabsList>

          <TabsContent value="avatar" className="space-y-4 mt-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={previewUrl} alt={username} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-medium">
                    {getInitials(username)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-sm text-muted-foreground text-center">
                點擊相機圖示上傳頭像<br />
                支援 JPG、PNG 格式，最大 500KB<br />
                <span className="text-xs text-primary">頭像將儲存在瀏覽器本地</span>
              </p>
              {previewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  移除頭像
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="password" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">目前密碼</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="輸入目前密碼"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新密碼</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="輸入新密碼"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">確認新密碼</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次輸入新密碼"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handlePasswordChange}
              disabled={isChangingPassword}
              className="w-full"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  處理中...
                </>
              ) : (
                "更改密碼"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
