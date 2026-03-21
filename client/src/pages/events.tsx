import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ScheduledEventWithHost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, Users, Plus, ChevronLeft, ChevronRight,
  MapPin, X, Check, Trash2, Edit3, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CATEGORIES = ["All", "Music", "Gaming", "Cooking", "Fitness", "Art", "Dance", "Travel", "Fashion", "Beauty", "Entertainment", "Education", "Wellness", "General"];

const CATEGORY_EMOJIS: Record<string, string> = {
  Music: "🎵", Gaming: "🎮", Cooking: "🍳", Fitness: "💪", Art: "🎨",
  Dance: "💃", Travel: "✈️", Fashion: "👗", Beauty: "💄", Entertainment: "🎭",
  Education: "📚", Wellness: "🧘", General: "📅", All: "🌟",
};

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatEventTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function getTimeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return "Started";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Events() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", selectedCategory],
    queryFn: () => api.getUpcomingEvents(100, selectedCategory === "All" ? undefined : selectedCategory),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const { data: myRsvps = [] } = useQuery({
    queryKey: ["myRsvps", user?.id],
    queryFn: () => api.getUserRsvps(user!.id),
    enabled: !!user?.id,
  });

  const rsvpMutation = useMutation({
    mutationFn: (eventId: string) => api.rsvpEvent(eventId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["myRsvps"] });
      toast({ title: "RSVP confirmed!" });
    },
  });

  const unrsvpMutation = useMutation({
    mutationFn: (eventId: string) => api.unrsvpEvent(eventId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["myRsvps"] });
      toast({ title: "RSVP removed" });
    },
  });

  const rsvpedEventIds = useMemo(() => {
    return new Set(myRsvps.map((r: any) => r.eventId));
  }, [myRsvps]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduledEventWithHost[]>();
    events.forEach((ev) => {
      const key = new Date(ev.scheduledAt).toISOString().split("T")[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return map;
  }, [events]);

  const filteredByDate = selectedDate
    ? events.filter(ev => new Date(ev.scheduledAt).toISOString().split("T")[0] === selectedDate)
    : events;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);

  const prevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
    else setCalendarMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
    else setCalendarMonth(m => m + 1);
  };

  return (
    <GuestGate>
      <Layout>
        <div className="p-3 max-w-2xl mx-auto pb-24">
          <div className="flex items-center justify-between mb-4 pt-2">
            <div className="flex items-center gap-2">
              <Link href="/explore">
                <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center" data-testid="button-back-explore">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <h1 className="text-xl font-bold" data-testid="text-events-title">Events</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}
                className="px-3 py-1.5 rounded-full bg-muted text-sm font-medium"
                data-testid="button-toggle-view"
              >
                {viewMode === "calendar" ? "List" : "Calendar"}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                data-testid="button-create-event"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setSelectedDate(null); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                data-testid={`button-category-${cat}`}
              >
                <span>{CATEGORY_EMOJIS[cat]}</span>
                {cat}
              </button>
            ))}
          </div>

          {viewMode === "calendar" && (
            <div className="bg-card rounded-2xl p-4 mb-4 border border-border">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" data-testid="button-prev-month">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="font-bold text-sm" data-testid="text-calendar-month">
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </h2>
                <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" data-testid="button-next-month">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                  <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const hasEvents = eventsByDate.has(dateStr);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const eventCount = eventsByDate.get(dateStr)?.length || 0;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : isToday
                          ? "bg-primary/20 text-primary font-bold"
                          : hasEvents
                          ? "bg-muted hover:bg-muted/80"
                          : "hover:bg-muted/50"
                      }`}
                      data-testid={`button-day-${dateStr}`}
                    >
                      {day}
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-0.5">
                          {Array.from({ length: Math.min(eventCount, 3) }).map((_, di) => (
                            <div
                              key={di}
                              className={`w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedDate && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <button onClick={() => setSelectedDate(null)} className="text-xs text-primary" data-testid="button-clear-date">
                Show all
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredByDate.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No upcoming events</p>
              <p className="text-muted-foreground/60 text-sm mt-1">
                {selectedDate ? "No events on this date" : "Be the first to schedule one!"}
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 rounded-full"
                data-testid="button-create-event-empty"
              >
                <Plus className="w-4 h-4 mr-1" /> Schedule Event
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredByDate.map((event) => {
                  const isRsvped = rsvpedEventIds.has(event.id);
                  return (
                    <motion.div
                      key={event.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-card rounded-2xl p-4 border border-border"
                      data-testid={`card-event-${event.id}`}
                    >
                      <div className="flex gap-3">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-lg">{CATEGORY_EMOJIS[event.category] || "📅"}</span>
                          <span className="text-[10px] font-bold text-primary leading-none mt-0.5">
                            {getTimeUntil(event.scheduledAt as any)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm truncate" data-testid={`text-event-title-${event.id}`}>
                            {event.title}
                          </h3>

                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatEventDate(event.scheduledAt as any)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatEventTime(event.scheduledAt as any)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <Link href={`/profile/${event.host.id}`}>
                              <div className="flex items-center gap-1.5 cursor-pointer">
                                <img
                                  src={event.host.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.host.username}`}
                                  alt={event.host.username}
                                  className="w-5 h-5 rounded-full"
                                />
                                <span className="text-xs font-medium">{event.host.username}</span>
                              </div>
                            </Link>
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Users className="w-3 h-3" />
                              {event.rsvpCount} going
                            </span>
                          </div>

                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{event.description}</p>
                          )}
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted">
                            {event.category}
                          </span>
                          {event.hostId !== user?.id ? (
                            <button
                              onClick={() => isRsvped ? unrsvpMutation.mutate(event.id) : rsvpMutation.mutate(event.id)}
                              disabled={rsvpMutation.isPending || unrsvpMutation.isPending}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                                isRsvped
                                  ? "bg-primary/20 text-primary"
                                  : "bg-primary text-primary-foreground"
                              }`}
                              data-testid={`button-rsvp-${event.id}`}
                            >
                              {isRsvped ? "Going ✓" : "RSVP"}
                            </button>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-500">
                              Your event
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showCreateModal && (
            <CreateEventModal onClose={() => setShowCreateModal(false)} />
          )}
        </AnimatePresence>
      </Layout>
    </GuestGate>
  );
}

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");

  const createMutation = useMutation({
    mutationFn: () => {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      return api.createEvent({
        hostId: user!.id,
        title,
        description: description || undefined,
        category,
        scheduledAt,
        durationMinutes: parseInt(duration),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "Event created!" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const isValid = title.trim() && date && time;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" data-testid="text-create-event-title">Schedule Event</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" data-testid="button-close-create">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Event Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's happening?"
              className="rounded-xl"
              data-testid="input-event-title"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what to expect..."
              className="w-full rounded-xl bg-muted border border-border p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="input-event-description"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter(c => c !== "All").map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    category === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`button-select-category-${cat}`}
                >
                  {CATEGORY_EMOJIS[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="rounded-xl"
                data-testid="input-event-date"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Time</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-xl"
                data-testid="input-event-time"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Duration</label>
            <div className="flex gap-2">
              {[
                { value: "30", label: "30 min" },
                { value: "60", label: "1 hr" },
                { value: "120", label: "2 hrs" },
                { value: "180", label: "3 hrs" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    duration === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`button-duration-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => createMutation.mutate()}
            disabled={!isValid || createMutation.isPending}
            className="w-full rounded-xl h-12 font-bold"
            data-testid="button-submit-event"
          >
            {createMutation.isPending ? "Creating..." : "Schedule Event"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
