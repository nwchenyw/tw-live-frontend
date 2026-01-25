import { Badge } from "@/components/ui/badge";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
  watchingCount: number;
  cachedCount: number;
  onliveCount: number;
  offliveCount: number;
  isConnected: boolean;
  username: string;
  avatarUrl?: string;
  onLogout: () => void;
  onAvatarChange: (url: string) => void;
}

export const Header = ({ 
  watchingCount, 
  cachedCount, 
  onliveCount, 
  offliveCount, 
  isConnected, 
  username,
  avatarUrl,
  onLogout,
  onAvatarChange 
}: HeaderProps) => {
  return (
    <header className="bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-[hsl(var(--primary))]">
        YT Live 影片檢測
      </h1>
      
      <div className="flex items-center gap-3">
        <Badge 
          variant="outline" 
          className={`${isConnected ? 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]' : 'bg-destructive text-destructive-foreground'} border-0`}
        >
          {isConnected ? 'ok' : 'offline'}
        </Badge>
        
        <Badge variant="outline" className="bg-[hsl(var(--live))] text-[hsl(var(--primary-foreground))] border-0">
          onlive {onliveCount}
        </Badge>
        
        <Badge variant="outline" className="bg-muted text-muted-foreground border">
          offlive {offliveCount}
        </Badge>
        
        <Badge variant="outline" className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-0">
          watching {watchingCount}
        </Badge>
        
        <Badge variant="outline" className="bg-muted text-muted-foreground border">
          cached {cachedCount}
        </Badge>
        
        <UserMenu 
          username={username}
          avatarUrl={avatarUrl}
          onLogout={onLogout}
          onAvatarChange={onAvatarChange}
        />
      </div>
    </header>
  );
};
