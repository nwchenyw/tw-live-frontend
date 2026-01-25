import { useState, useRef, useEffect, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
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
import { Camera, Eye, EyeOff, Loader2, Trash2, Check, X } from "lucide-react";

// 從環境變數讀取後端 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://tw-live.nwchenyw.com";

// localStorage key for avatar URL (stores server URL, not base64)
const getAvatarStorageKey = (userId: string) => `avatar_url_${userId}`;

// Some browsers can cache a previous 404 for the same image URL; add a cache-buster so the
// avatar will re-fetch immediately after backend fixes or re-uploads.
const withCacheBust = (url: string) => {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${Date.now()}`;
};

// 從 localStorage 讀取頭像 URL
export const getStoredAvatar = (userId: string): string | null => {
  try {
    return localStorage.getItem(getAvatarStorageKey(userId));
  } catch {
    return null;
  }
};

// 儲存頭像 URL 到 localStorage
const saveAvatarUrlToStorage = (userId: string, url: string): void => {
  try {
    localStorage.setItem(getAvatarStorageKey(userId), url);
  } catch (e) {
    console.error("無法儲存頭像 URL:", e);
  }
};

// 從 localStorage 刪除頭像 URL
const removeAvatarFromStorage = (userId: string): void => {
  try {
    localStorage.removeItem(getAvatarStorageKey(userId));
  } catch {
    // ignore
  }
};

// Helper function to create centered square crop
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

// Helper function to get cropped image as blob
async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  canvas.width = crop.width;
  canvas.height = crop.height;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No 2d context");
  }

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.9
    );
  });
}

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
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Avatar state
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentAvatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Crop state
  const [cropImageSrc, setCropImageSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 當 dialog 開啟時，從 localStorage 讀取頭像 URL
  useEffect(() => {
    if (open && userId) {
      const storedAvatar = getStoredAvatar(userId);
      if (storedAvatar) {
        setPreviewUrl(withCacheBust(storedAvatar));
      } else {
        setPreviewUrl(currentAvatarUrl);
      }
    }
  }, [open, userId, currentAvatarUrl]);

  // Reset crop state when dialog closes
  useEffect(() => {
    if (!open) {
      setCropImageSrc("");
      setCrop(undefined);
      setCompletedCrop(undefined);
      setIsCropping(false);
    }
  }, [open]);

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

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

    // Validate file size (max 5MB for cropping, will be compressed after)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "錯誤",
        description: "圖片大小不能超過 5MB",
        variant: "destructive",
      });
      return;
    }

    // Read file and show crop UI
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropCancel = () => {
    setCropImageSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    setIsCropping(false);
  };

  const handleCropConfirm = async () => {
    if (!imgRef.current || !completedCrop) {
      toast({
        title: "錯誤",
        description: "請選擇裁切區域",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Get cropped image as blob
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append("file", croppedBlob, "avatar.jpg");

      // Upload to backend (user_id as query parameter)
      const response = await fetch(`${API_BASE_URL}/upload-avatar?user_id=${encodeURIComponent(userId)}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || "上傳失敗");
      }

      const data = await response.json();
      const avatarUrl = data.avatar_url;

      // Construct full URL if it's a relative path
      const fullAvatarUrl = avatarUrl.startsWith("http") 
        ? avatarUrl 
        : `${API_BASE_URL}${avatarUrl}`;

      // Save URL to localStorage
      saveAvatarUrlToStorage(userId, fullAvatarUrl);
      const displayUrl = withCacheBust(fullAvatarUrl);
      setPreviewUrl(displayUrl);
      onAvatarChange(displayUrl);

      // Reset crop state
      handleCropCancel();

      toast({
        title: "成功",
        description: "頭像已上傳",
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast({
        title: "上傳失敗",
        description: error instanceof Error ? error.message : "無法上傳頭像",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    
    try {
      // Call backend to delete avatar
      const response = await fetch(`${API_BASE_URL}/delete-avatar/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || "刪除失敗");
      }

      removeAvatarFromStorage(userId);
      setPreviewUrl(undefined);
      onAvatarChange("");
      
      toast({
        title: "成功",
        description: "頭像已移除",
      });
    } catch (error) {
      // If delete endpoint doesn't exist, just clear locally
      console.warn("Delete avatar endpoint may not exist:", error);
      removeAvatarFromStorage(userId);
      setPreviewUrl(undefined);
      onAvatarChange("");
      
      toast({
        title: "成功",
        description: "頭像已移除",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
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
            {isCropping ? (
              // Crop UI
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  拖曳選擇裁切區域
                </p>
                <div className="max-h-[300px] overflow-hidden rounded-lg border">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    circularCrop
                  >
                    <img
                      ref={imgRef}
                      src={cropImageSrc}
                      alt="裁切預覽"
                      onLoad={onImageLoad}
                      style={{ maxHeight: "300px", maxWidth: "100%" }}
                    />
                  </ReactCrop>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCropCancel}
                    disabled={isUploadingAvatar}
                  >
                    <X className="mr-2 h-4 w-4" />
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCropConfirm}
                    disabled={isUploadingAvatar || !completedCrop}
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    確認上傳
                  </Button>
                </div>
              </div>
            ) : (
              // Normal avatar display
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
                  支援 JPG、PNG 格式，最大 5MB
                </p>
                {previewUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    移除頭像
                  </Button>
                )}
              </div>
            )}
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
