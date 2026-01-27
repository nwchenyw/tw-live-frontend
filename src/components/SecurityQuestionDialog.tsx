import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SecurityQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
}

const SECURITY_QUESTIONS = [
  "您的出生城市是？",
  "您第一隻寵物的名字是？",
  "您母親的娘家姓氏是？",
  "您最喜歡的電影是？",
  "您小學的名稱是？",
  "您最好朋友的名字是？",
  "您最喜歡的食物是？",
  "您第一份工作的公司名稱是？",
];

export const SecurityQuestionDialog = ({
  open,
  onOpenChange,
  username,
}: SecurityQuestionDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

  const resetState = () => {
    setPassword("");
    setShowPassword(false);
    setSelectedQuestion("");
    setSecurityAnswer("");
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!password || !selectedQuestion || !securityAnswer.trim()) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "請填寫所有欄位",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-set-security-question`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            username,
            password,
            securityQuestion: selectedQuestion,
            securityAnswer: securityAnswer.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set security question");
      }

      toast({
        title: "設定成功",
        description: "安全問題已成功設定",
      });
      handleClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "設定失敗",
        description: error.message || "無法設定安全問題",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            設定安全問題
          </DialogTitle>
          <DialogDescription>
            設定安全問題可在忘記密碼時用於驗證身份
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">驗證密碼</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="輸入您的密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>選擇安全問題</Label>
            <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
              <SelectTrigger>
                <SelectValue placeholder="選擇一個問題" />
              </SelectTrigger>
              <SelectContent>
                {SECURITY_QUESTIONS.map((question) => (
                  <SelectItem key={question} value={question}>
                    {question}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">您的答案</Label>
            <Input
              id="answer"
              placeholder="輸入安全問題的答案"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              答案不區分大小寫
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              取消
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={isLoading}>
              {isLoading ? "處理中..." : "儲存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
