import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const REMEMBER_KEY = "yt_live_remember_username";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, signup, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

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
        const { error } = await signup(username, password, adminPassword);
        if (error) throw new Error(error);
        toast({
          title: "註冊成功",
          description: "帳號已建立，您可以直接登入。",
        });
        setIsSignUp(false);
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
          )}

          {/* Remember Me (only for login) */}
          {!isSignUp && (
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
    </div>
  );
};

export default Login;
