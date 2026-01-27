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
import { User, HelpCircle, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "username" | "answer" | "reset" | "success";

export const ForgotPasswordDialog = ({ open, onOpenChange }: ForgotPasswordDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("username");
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetState = () => {
    setStep("username");
    setUsername("");
    setSecurityQuestion("");
    setSecurityAnswer("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleGetQuestion = async () => {
    if (!username.trim()) {
      toast({ variant: "destructive", title: "錯誤", description: "請輸入使用者名稱" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "get-question", username: username.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get security question");
      }

      setSecurityQuestion(data.securityQuestion);
      setStep("answer");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "錯誤",
        description: error.message || "無法取得安全問題",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAnswer = () => {
    if (!securityAnswer.trim()) {
      toast({ variant: "destructive", title: "錯誤", description: "請輸入安全問題答案" });
      return;
    }
    setStep("reset");
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ variant: "destructive", title: "錯誤", description: "請填寫所有欄位" });
      return;
    }

    if (newPassword.length < 4) {
      toast({ variant: "destructive", title: "錯誤", description: "密碼至少需要 4 個字元" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "錯誤", description: "兩次密碼輸入不一致" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: "reset-password",
            username: username.trim(),
            securityAnswer: securityAnswer.trim(),
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setStep("success");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "重設失敗",
        description: error.message || "無法重設密碼",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "username":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">使用者名稱</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="輸入您的使用者名稱"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleGetQuestion()}
                />
              </div>
            </div>
            <Button onClick={handleGetQuestion} className="w-full" disabled={isLoading}>
              {isLoading ? "處理中..." : "下一步"}
            </Button>
          </div>
        );

      case "answer":
        return (
          <div className="space-y-4">
            <button
              onClick={() => setStep("username")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
            
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">安全問題</p>
                  <p className="text-sm text-muted-foreground">{securityQuestion}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">您的答案</Label>
              <Input
                id="answer"
                placeholder="輸入安全問題的答案"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyAnswer()}
              />
            </div>
            <Button onClick={handleVerifyAnswer} className="w-full">
              驗證答案
            </Button>
          </div>
        );

      case "reset":
        return (
          <div className="space-y-4">
            <button
              onClick={() => setStep("answer")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新密碼</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="輸入新密碼"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">確認新密碼</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="再次輸入新密碼"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button onClick={handleResetPassword} className="w-full" disabled={isLoading}>
              {isLoading ? "處理中..." : "重設密碼"}
            </Button>
          </div>
        );

      case "success":
        return (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">密碼重設成功！</h3>
              <p className="text-sm text-muted-foreground mt-1">
                您現在可以使用新密碼登入
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              返回登入
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "success" ? "" : "忘記密碼"}
          </DialogTitle>
          {step === "username" && (
            <DialogDescription>
              輸入您的使用者名稱以開始密碼重設流程
            </DialogDescription>
          )}
        </DialogHeader>
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
};
