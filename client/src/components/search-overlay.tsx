import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import UserAvatar from "@/components/user-avatar";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setDebouncedSearch("");
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(trimmed), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["searchUsers", debouncedSearch],
    queryFn: () => api.searchUsers(debouncedSearch),
    enabled: debouncedSearch.length >= 3,
  });

  if (!open) return null;

  const handleClose = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    onClose();
  };

  const handleSelect = (userId: string) => {
    handleClose();
    setLocation(`/profile/${userId}`);
  };

  const filtered = searchResults?.filter((u) => u.id !== user?.id) || [];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm" data-testid="search-overlay">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              data-testid="input-global-search"
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={handleClose}
            data-testid="button-close-search"
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-100px)]">
          {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
            <p className="text-muted-foreground text-sm text-center py-8">Type at least 3 characters to search</p>
          )}
          {searchLoading && debouncedSearch.length >= 3 && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 w-28 bg-muted rounded mb-2" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {debouncedSearch.length >= 3 && !searchLoading && filtered.length > 0 && (
            <div className="space-y-1">
              {filtered.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleSelect(result.id)}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  data-testid={`search-result-${result.id}`}
                >
                  <UserAvatar
                    userId={result.id}
                    username={result.username}
                    avatar={result.avatar}
                    isLive={result.isLive}
                    isOnline={result.isLive}
                    size="md"
                    showStatus={true}
                    linkToProfile={false}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{result.username}</h3>
                    <p className="text-muted-foreground text-xs">Level {result.level} {result.isLive ? "• Live now" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {debouncedSearch.length >= 3 && !searchLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No users found</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Try a different name</p>
            </div>
          )}
          {searchQuery.trim().length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Search for users</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Find anyone on the platform</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
