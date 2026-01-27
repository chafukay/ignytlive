import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface BadgesDisplayProps {
  userId: string;
  size?: "sm" | "md" | "lg";
}

export default function BadgesDisplay({ userId, size = "md" }: BadgesDisplayProps) {
  const { data: badges } = useQuery({
    queryKey: ['user-badges', userId],
    queryFn: () => api.getUserBadges(userId),
    enabled: !!userId,
  });

  if (!badges || badges.length === 0) return null;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center gap-1 flex-wrap" data-testid="badges-display">
      {badges.slice(0, 5).map((ub) => (
        <span
          key={ub.id}
          className={`${sizeClasses[size]} cursor-default`}
          title={`${ub.badge.name}: ${ub.badge.description || ''}`}
          data-testid={`badge-${ub.badge.id}`}
        >
          {ub.badge.icon}
        </span>
      ))}
      {badges.length > 5 && (
        <span className="text-xs text-white/50">+{badges.length - 5}</span>
      )}
    </div>
  );
}
