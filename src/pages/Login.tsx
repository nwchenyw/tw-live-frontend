import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Lock, Eye, EyeOff, ShieldQuestion } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";

const REMEMBER_KEY = "yt_live_remember_username";

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

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, signup, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    // Check for remembered username
    const rememberedUsername = localStorage.getItem(REMEMBER_KEY);
    if (rememberedUsername) {
      setUsername(rememberedUsername);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Validate security question
        if (!securityQuestion || !securityAnswer.trim()) {
          throw new Error("請選擇安全問題並填寫答案");
        }
        
        const { error } = await signup(username, password, adminPassword, securityQuestion, securityAnswer);
        if (error) throw new Error(error);
        toast({
          title: "註冊成功",
          description: "帳號已建立，您可以直接登入。",
        });
        setIsSignUp(false);
        // Clear signup fields
        setAdminPassword("");
        setSecurityQuestion("");
        setSecurityAnswer("");
      } else {
        const { error } = await login(username, password);
        if (error) throw new Error(error);
        
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem(REMEMBER_KEY, username);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        
        navigate("/");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: isSignUp ? "註冊失敗" : "登入失敗",
        description: error.message || "請檢查您的帳號密碼",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo & Title */}
        <div className="text-center">
          <h1 className="text-4xl font-light text-foreground tracking-tight">
            YT Live 影片檢測
          </h1>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10 h-11 bg-background border-input"
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11 bg-background border-input"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Admin Password Input (only for signup) */}
          {isSignUp && (
            <>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showAdminPassword ? "text" : "password"}
                  placeholder="Admin Password (管理員密碼)"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-background border-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAdminPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Security Question */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <ShieldQuestion className="w-4 h-4" />
                  安全問題 (用於密碼重設)
                </Label>
                <Select value={securityQuestion} onValueChange={setSecurityQuestion}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="選擇一個安全問題" />
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

              {/* Security Answer */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="安全問題的答案"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className="h-11 bg-background border-input"
                  required={isSignUp}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  答案不區分大小寫
                </p>
              </div>
            </>
          )}

          {/* Remember Me & Forgot Password (only for login) */}
          {!isSignUp && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  記住我
                </Label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:underline"
              >
                忘記密碼？
              </button>
            </div>
          )}

          {/* Login Button */}
          <Button
            type="submit"
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            disabled={isLoading}
          >
            {isLoading ? "處理中..." : isSignUp ? "註冊" : "Login"}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Copyright © 2024 - 2026 YT Live 影片檢測
          </p>
          
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary hover:underline"
          >
            {isSignUp ? "已有帳號？登入" : "沒有帳號？註冊"}
          </button>
        </div>
      </div>

      <ForgotPasswordDialog 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
};

export default Login;
