import Layout from "@/components/layout";
import { Heart, MessageCircle, Share2, Music2, Disc, Plus, Video, X, Send, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useGuestCheck } from "@/components/guest-gate";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface ShortComment {
  id: string;
  shortId: string;
  userId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  repliesCount: number;
  createdAt: string;
  user: User;
  replies: (ShortComment & { user: User })[];
}

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "🔥"];

export default function Shorts() {
  const [activeShort, setActiveShort] = useState(0);
  const [likedShorts, setLikedShorts] = useState<Record<string, boolean>>({});
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const { user } = useAuth();
  const { isGuest, requireAccount } = useGuestCheck();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shorts, isLoading, isError: shortsError, refetch: refetchShorts } = useQuery({
    queryKey: ['shorts'],
    queryFn: () => api.getShortsFeed(),
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['short-comments', showComments],
    queryFn: () => showComments ? api.getShortComments(showComments) : Promise.resolve([]),
    enabled: !!showComments,
  });

  useEffect(() => {
    if (shorts && user) {
      shorts.forEach(async (short) => {
        const liked = await api.isShortLiked(short.id, user.id);
        setLikedShorts(prev => ({ ...prev, [short.id]: liked }));
      });
    }
  }, [shorts, user]);

  const likeMutation = useMutation({
    mutationFn: (shortId: string) => api.likeShort(shortId, user!.id),
    onSuccess: (data, shortId) => {
      setLikedShorts(prev => ({ ...prev, [shortId]: data.liked }));
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ shortId, content, parentId }: { shortId: string; content: string; parentId?: string }) => 
      api.createShortComment(shortId, user!.id, content, parentId),
    onSuccess: () => {
      setCommentText("");
      setReplyingTo(null);
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.deleteShortComment(commentId, user!.id),
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: ({ commentId, reaction }: { commentId: string; reaction: string }) => 
      api.reactToComment(commentId, user!.id, reaction),
    onSuccess: () => {
      refetchComments();
      setShowReactionPicker(null);
    },
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const index = Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight);
    setActiveShort(index);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const handleSubmitComment = () => {
    if (isGuest) { requireAccount(); return; }
    if (!commentText.trim() || !showComments) return;
    commentMutation.mutate({
      shortId: showComments,
      content: commentText,
      parentId: replyingTo?.id,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[calc(100vh-5rem)] md:h-screen w-full bg-background flex flex-col items-center justify-center gap-4">
          <div className="w-full max-w-sm px-6 space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted animate-pulse mx-auto" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded mx-auto" />
            <div className="h-3 w-1/2 bg-muted animate-pulse rounded mx-auto" />
            <div className="flex justify-center gap-6 mt-6">
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (shortsError) {
    return (
      <Layout>
        <div className="h-[calc(100vh-5rem)] md:h-screen w-full bg-background flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-destructive/50" />
          </div>
          <p className="text-foreground font-medium">Couldn't load shorts</p>
          <p className="text-muted-foreground text-sm mt-1">Something went wrong. Please try again.</p>
          <button
            onClick={() => refetchShorts()}
            className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-full text-sm hover:opacity-90 transition-opacity"
            data-testid="button-retry-shorts"
          >
            Try Again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {user && (
        <Link href="/post-short">
          <button
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-full shadow-lg hover:opacity-90 transition-opacity"
            data-testid="button-post-short"
          >
            <Video className="w-5 h-5" />
            <span>Post Short</span>
          </button>
        </Link>
      )}

      {!shorts || shorts.length === 0 ? (
        <div className="h-[calc(100vh-5rem)] md:h-screen w-full bg-background flex flex-col items-center justify-center">
          <div className="text-muted-foreground text-center">
            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No shorts available yet</p>
            <p className="text-sm mt-2">Be the first to post a short!</p>
            {user && (
              <Link href="/post-short">
                <button className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-full">
                  Post Your First Short
                </button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div 
          className="h-[calc(100vh-5rem)] md:h-screen w-full snap-y snap-mandatory overflow-y-scroll no-scrollbar bg-background"
          onScroll={handleScroll}
        >
          {shorts.map((short, i) => {
            const isVideo = short.videoUrl && (
              short.videoUrl.startsWith('data:video/') || 
              short.videoUrl.endsWith('.mp4') ||
              short.videoUrl.endsWith('.webm') ||
              short.videoUrl.endsWith('.mov')
            );
            const isLiked = likedShorts[short.id];

            return (
            <div key={short.id} className="h-full w-full snap-start relative flex items-center justify-center bg-card">
              {isVideo ? (
                <video 
                  src={short.videoUrl}
                  className="w-full h-full object-cover"
                  autoPlay={i === activeShort}
                  loop
                  muted
                  playsInline
                  data-testid={`video-short-${short.id}`}
                />
              ) : (
                <img 
                  src={short.thumbnail || short.videoUrl || "https://api.dicebear.com/7.x/shapes/svg?seed=" + short.id} 
                  alt="Short" 
                  className="w-full h-full object-cover opacity-90"
                  data-testid={`img-short-${short.id}`}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90" />

              <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6 z-20">
                <Link href={`/profile/${short.user.id}`}>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-foreground overflow-hidden p-0.5">
                      <img 
                        src={short.user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + short.user.username} 
                        className="w-full h-full rounded-full object-cover" 
                        data-testid={`img-avatar-${short.id}`}
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary rounded-full p-0.5">
                      <Plus className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </Link>

                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={() => { if (isGuest) { requireAccount(); return; } user && likeMutation.mutate(short.id); }}
                    disabled={!user || likeMutation.isPending}
                    className="p-3 rounded-full bg-muted/50 backdrop-blur-md hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                    data-testid={`button-like-${short.id}`}
                  >
                    <Heart className={`w-7 h-7 transition-colors ${isLiked ? 'text-red-500 fill-red-500' : 'text-foreground fill-muted hover:fill-red-500 hover:text-red-500'}`} />
                  </button>
                  <span className="text-foreground text-xs font-bold" data-testid={`text-likes-${short.id}`}>
                    {formatCount(short.likesCount)}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={() => setShowComments(short.id)}
                    className="p-3 rounded-full bg-muted/50 backdrop-blur-md hover:bg-muted transition-colors cursor-pointer"
                    data-testid={`button-comments-${short.id}`}
                  >
                    <MessageCircle className="w-7 h-7 text-foreground fill-muted" />
                  </button>
                  <span className="text-foreground text-xs font-bold">{formatCount(short.commentsCount)}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={async () => {
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: short.description || 'Check out this short!', url: window.location.href });
                        }
                        await fetch(`${(await import('@/lib/capacitor')).getServerUrl()}/api/shorts/${short.id}/share`, { method: 'POST' });
                      } catch {}
                    }}
                    className="p-3 rounded-full bg-muted/50 backdrop-blur-md hover:bg-muted transition-colors cursor-pointer"
                    data-testid={`button-share-${short.id}`}
                  >
                    <Share2 className="w-7 h-7 text-foreground" />
                  </button>
                  <span className="text-foreground text-xs font-bold">{formatCount(short.sharesCount)}</span>
                </div>

                <div className="mt-2 animate-[spin_5s_linear_infinite]">
                  <div className="w-12 h-12 rounded-full bg-card border-4 border-background flex items-center justify-center relative overflow-hidden">
                    <img 
                      src={short.user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + short.user.username} 
                      className="w-full h-full object-cover opacity-80" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Disc className="w-6 h-6 text-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 left-4 right-16 z-20 text-foreground">
                <Link href={`/profile/${short.user.id}`}>
                  <h3 className="font-bold text-lg mb-2 hover:underline" data-testid={`text-username-${short.id}`}>
                    @{short.user.username}
                  </h3>
                </Link>
                <p className="text-sm mb-4 line-clamp-2">{short.description || "Check out this short!"}</p>
                
                {short.song && (
                  <div className="flex items-center gap-2 bg-muted/50 w-fit px-3 py-1 rounded-full backdrop-blur-sm animate-pulse">
                    <Music2 className="w-3 h-3" />
                    <div className="text-xs overflow-hidden w-32 whitespace-nowrap">
                      <span className="inline-block animate-marquee">{short.song}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {showComments && (
        <div className="fixed inset-0 bg-background/80 z-50 flex items-end justify-center" onClick={() => setShowComments(null)}>
          <div 
            className="bg-card w-full max-w-lg rounded-t-3xl max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-foreground font-bold text-lg">
                {(comments as ShortComment[])?.length || 0} Comments
              </h2>
              <button onClick={() => setShowComments(null)} className="text-muted-foreground hover:text-foreground" data-testid="button-close-comments">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!comments || (comments as ShortComment[]).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                (comments as ShortComment[]).map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex gap-3">
                      <Link href={`/profile/${comment.user.id}`}>
                        <img 
                          src={comment.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.username}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/profile/${comment.user.id}`}>
                            <span className="text-foreground font-semibold text-sm hover:underline">@{comment.user.username}</span>
                          </Link>
                          <span className="text-muted-foreground text-xs">{formatTime(comment.createdAt)}</span>
                        </div>
                        <p className="text-foreground/90 text-sm mt-1">{comment.content}</p>
                        
                        <div className="flex items-center gap-4 mt-2">
                          <div className="relative">
                            <button 
                              onClick={() => setShowReactionPicker(showReactionPicker === comment.id ? null : comment.id)}
                              className="text-muted-foreground text-xs hover:text-foreground flex items-center gap-1"
                            >
                              <Heart className="w-4 h-4" />
                              <span>{comment.likesCount}</span>
                            </button>
                            {showReactionPicker === comment.id && (
                              <div className="absolute bottom-full left-0 mb-2 bg-muted rounded-full px-2 py-1 flex gap-1 shadow-lg">
                                {REACTION_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => { if (isGuest) { requireAccount(); return; } user && reactMutation.mutate({ commentId: comment.id, reaction: emoji }); }}
                                    className="hover:scale-125 transition-transform text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => setReplyingTo({ id: comment.id, username: comment.user.username })}
                            className="text-muted-foreground text-xs hover:text-foreground"
                          >
                            Reply
                          </button>
                          {user && comment.userId === user.id && (
                            <button 
                              onClick={() => deleteCommentMutation.mutate(comment.id)}
                              className="text-red-400/50 text-xs hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {comment.replies.length > 0 && (
                          <div className="mt-3">
                            <button 
                              onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                              className="text-purple-400 text-xs flex items-center gap-1 hover:text-purple-300"
                            >
                              {expandedReplies[comment.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                            </button>
                            
                            {expandedReplies[comment.id] && (
                              <div className="mt-2 space-y-3 pl-4 border-l border-border">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex gap-2">
                                    <Link href={`/profile/${reply.user.id}`}>
                                      <img 
                                        src={reply.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.user.username}`}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    </Link>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <Link href={`/profile/${reply.user.id}`}>
                                          <span className="text-foreground font-semibold text-xs hover:underline">@{reply.user.username}</span>
                                        </Link>
                                        <span className="text-muted-foreground text-xs">{formatTime(reply.createdAt)}</span>
                                      </div>
                                      <p className="text-foreground/90 text-xs mt-1">{reply.content}</p>
                                      <div className="flex items-center gap-3 mt-1">
                                        <div className="relative">
                                          <button 
                                            onClick={() => setShowReactionPicker(showReactionPicker === reply.id ? null : reply.id)}
                                            className="text-muted-foreground text-xs hover:text-foreground flex items-center gap-1"
                                          >
                                            <Heart className="w-3 h-3" />
                                            <span>{reply.likesCount}</span>
                                          </button>
                                          {showReactionPicker === reply.id && (
                                            <div className="absolute bottom-full left-0 mb-2 bg-muted rounded-full px-2 py-1 flex gap-1 shadow-lg">
                                              {REACTION_EMOJIS.map((emoji) => (
                                                <button
                                                  key={emoji}
                                                  onClick={() => { if (isGuest) { requireAccount(); return; } user && reactMutation.mutate({ commentId: reply.id, reaction: emoji }); }}
                                                  className="hover:scale-125 transition-transform text-lg"
                                                >
                                                  {emoji}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        {user && reply.userId === user.id && (
                                          <button 
                                            onClick={() => deleteCommentMutation.mutate(reply.id)}
                                            className="text-red-400/50 text-xs hover:text-red-400"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {user ? (
              <div className="p-4 border-t border-border">
                {replyingTo && (
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <span className="text-muted-foreground">Replying to</span>
                    <span className="text-purple-400">@{replyingTo.username}</span>
                    <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground ml-auto">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-3 items-center">
                  <img 
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                    className="flex-1 bg-muted text-foreground placeholder:text-muted-foreground rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                    data-testid="input-comment"
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    className="p-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full disabled:opacity-50"
                    data-testid="button-submit-comment"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-border text-center">
                <p className="text-muted-foreground text-sm">
                  <Link href="/login" className="text-purple-400 hover:underline">Log in</Link> to comment
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
