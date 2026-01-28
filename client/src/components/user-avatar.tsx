import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface UserAvatarProps {
  userId: string;
  username: string;
  avatar?: string | null;
  isLive?: boolean;
  isOnline?: boolean;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  linkToProfile?: boolean;
  className?: string;
}

export default function UserAvatar({
  userId,
  username,
  avatar,
  isLive = false,
  isOnline = false,
  size = "md",
  showStatus = true,
  linkToProfile = true,
  className,
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const statusSizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const liveBadgeClasses = {
    sm: "text-[6px] px-1",
    md: "text-[8px] px-1.5 py-0.5",
    lg: "text-[10px] px-2 py-1",
  };

  const avatarContent = (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "rounded-full overflow-hidden",
          !className?.includes("w-") && sizeClasses[size],
          isLive ? "border-2 border-pink-500 p-0.5" : "border-2 border-transparent",
          className?.includes("w-") && className
        )}
      >
        <img
          src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
          alt={username}
          className={cn(
            "w-full h-full rounded-full object-cover",
            !isLive && !isOnline && "grayscale opacity-60"
          )}
        />
      </div>

      {showStatus && (
        <>
          {isLive ? (
            <div
              className={cn(
                "absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white font-bold rounded-full",
                liveBadgeClasses[size]
              )}
            >
              LIVE
            </div>
          ) : (
            <div
              className={cn(
                "absolute bottom-0 right-0 rounded-full border-2 border-background",
                statusSizeClasses[size],
                isOnline ? "bg-green-500" : "bg-gray-500"
              )}
            />
          )}
        </>
      )}
    </div>
  );

  if (linkToProfile) {
    return (
      <Link href={`/profile/${userId}`} data-testid={`avatar-${userId}`}>
        {avatarContent}
      </Link>
    );
  }

  return avatarContent;
}
