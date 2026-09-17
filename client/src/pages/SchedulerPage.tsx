import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Phone,
  Video,
  MapPin,
  User,
  Mail,
  Zap,
  Settings,
  Bot,
  Send,
  X,
  Edit2,
  Trash2,
  MoreHorizontal,
  CalendarDays,
  CalendarRange,
  List,
  Bell,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day" | "list";
type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

interface MockBooking {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  eventTitle: string;
  location?: string;
  locationType: "in_person" | "phone" | "video" | "other";
  color: string;
  bookedVia: string;
  aiSummary?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  no_show: "bg-gray-100 text-gray-600 border-gray-200",
};

const LOCATION_ICON = {
  in_person: MapPin,
  phone: Phone,
  video: Video,
  other: MapPin,
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Mock data (replaced by real tRPC data once wired) ────────────────────────

function generateMockBookings(): MockBooking[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return [
    {
      id: 1, guestName: "Sarah Johnson", guestEmail: "sarah@example.com", guestPhone: "555-0101",
      startAt: new Date(year, month, now.getDate() + 1, 10, 0),
      endAt: new Date(year, month, now.getDate() + 1, 10, 30),
      status: "confirmed", eventTitle: "30-min Consultation", locationType: "video",
      color: "#1A6FFF", bookedVia: "ai_agent",
      aiSummary: "Client wants to discuss HVAC maintenance plan for their 3-unit property.",
    },
    {
      id: 2, guestName: "Mike Torres", guestEmail: "mike@example.com",
      startAt: new Date(year, month, now.getDate() + 1, 14, 0),
      endAt: new Date(year, month, now.getDate() + 1, 15, 0),
      status: "pending", eventTitle: "HVAC Tune-Up", locationType: "in_person",
      location: "123 Main St, Chicago IL", color: "#10B981", bookedVia: "online_form",
    },
    {
      id: 3, guestName: "Lisa Chen", guestEmail: "lisa@example.com",
      startAt: new Date(year, month, now.getDate() + 3, 9, 0),
      endAt: new Date(year, month, now.getDate() + 3, 9, 45),
      status: "confirmed", eventTitle: "Dental Checkup", locationType: "in_person",
      color: "#8B5CF6", bookedVia: "manual",
    },
    {
      id: 4, guestName: "David Park", guestEmail: "david@example.com",
      startAt: new Date(year, month, now.getDate() - 2, 11, 0),
      endAt: new Date(year, month, now.getDate() - 2, 12, 0),
      status: "completed", eventTitle: "Roof Inspection", locationType: "in_person",
      color: "#F59E0B", bookedVia: "ai_agent",
      aiSummary: "Completed roof inspection. Found minor damage on north side. Quoted $1,200 repair.",
    },
    {
      id: 5, guestName: "Emma Wilson", guestEmail: "emma@example.com",
      startAt: new Date(year, month, now.getDate() + 5, 15, 30),
      endAt: new Date(year, month, now.getDate() + 5, 16, 0),
      status: "confirmed", eventTitle: "Follow-up Call", locationType: "phone",
      color: "#EC4899", bookedVia: "sms",
    },
  ];
}

const EVENT_TYPES_MOCK = [
  { id: 1, title: "30-min Consultation", durationMinutes: 30, color: "#1A6FFF", locationType: "video", price: null },
  { id: 2, title: "HVAC Tune-Up", durationMinutes: 60, color: "#10B981", locationType: "in_person", price: 149 },
  { id: 3, title: "Roof Inspection", durationMinutes: 90, color: "#F59E0B", locationType: "in_person", price: 99 },
  { id: 4, title: "Follow-up Call", durationMinutes: 15, color: "#EC4899", locationType: "phone", price: null },
];

const AVAILABILITY_MOCK = [
  { day: "Monday", enabled: true, start: "09:00", end: "17:00" },
  { day: "Tuesday", enabled: true, start: "09:00", end: "17:00" },
  { day: "Wednesday", enabled: true, start: "09:00", end: "17:00" },
  { day: "Thursday", enabled: true, start: "09:00", end: "17:00" },
  { day: "Friday", enabled: true, start: "09:00", end: "17:00" },
  { day: "Saturday", enabled: false, start: "10:00", end: "14:00" },
  { day: "Sunday", enabled: false, start: "10:00", end: "14:00" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function BookingDot({ booking, onClick }: { booking: MockBooking; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate hover:opacity-80 transition-opacity"
      style={{ backgroundColor: booking.color + "20", color: booking.color, borderLeft: `2px solid ${booking.color}` }}
    >
      {formatTime(booking.startAt)} {booking.guestName.split(" ")[0]}
    </button>
  );
}

function BookingDetailPanel({ booking, onClose, onStatusChange }: {
  booking: MockBooking;
  onClose: () => void;
  onStatusChange: (id: number, status: BookingStatus) => void;
}) {
  const LocIcon = LOCATION_ICON[booking.locationType];

  // iCal export — generate .ics file client-side
  const downloadIcal = () => {
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const uid = `booking-${booking.id}@vonwork.ai`;
    const now = fmt(new Date());
    const start = fmt(booking.startAt);
    const end = fmt(booking.endAt);
    const loc = booking.location ?? booking.locationType.replace("_", " ");
    const ical = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VonWork AI Scheduler//EN",
      "CALSCALE:GREGORIAN", "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${uid}`, `DTSTAMP:${now}`, `DTSTART:${start}`, `DTEND:${end}`,
      `SUMMARY:${booking.eventTitle} with ${booking.guestName}`,
      `DESCRIPTION:Booked via VonWork AI Scheduler\\nGuest: ${booking.guestName} <${booking.guestEmail}>`,
      `LOCATION:${loc}`,
      `STATUS:${booking.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ical], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `booking-${booking.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar event downloaded!");
  };
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100" style={{ background: `linear-gradient(135deg, ${booking.color}15, ${booking.color}05)` }}>
        <div>
          <h3 className="font-semibold text-gray-900">{booking.eventTitle}</h3>
          <p className="text-sm text-gray-500">{formatDate(booking.startAt)} · {formatTime(booking.startAt)} – {formatTime(booking.endAt)}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <Badge className={`text-xs border ${STATUS_COLORS[booking.status]}`}>{booking.status}</Badge>
          <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">{booking.bookedVia.replace("_", " ")}</Badge>
        </div>
        {/* Guest info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{booking.guestName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>{booking.guestEmail}</span>
          </div>
          {booking.guestPhone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{booking.guestPhone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <LocIcon className="w-4 h-4 text-gray-400" />
            <span>{booking.location ?? booking.locationType.replace("_", " ")}</span>
          </div>
        </div>
        {/* AI Summary */}
        {booking.aiSummary && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-1.5">
              <Bot className="w-3.5 h-3.5" /> AI Summary
            </div>
            <p className="text-sm text-blue-800">{booking.aiSummary}</p>
          </div>
        )}
        {/* Actions */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Update Status</p>
          <div className="grid grid-cols-2 gap-2">
            {(["confirmed", "completed", "cancelled", "no_show"] as BookingStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange(booking.id, s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  booking.status === s ? STATUS_COLORS[s] : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-gray-100 space-y-2">
        <Button size="sm" variant="outline" className="w-full text-xs text-blue-700 border-blue-200 hover:bg-blue-50" onClick={downloadIcal}>
          <Calendar className="w-3.5 h-3.5 mr-1" /> Export to Calendar (.ics)
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs">
            <Edit2 className="w-3.5 h-3.5 mr-1" /> Reschedule
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => onStatusChange(booking.id, "cancelled")}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ year, month, bookings, onSelectBooking, onSelectDay }: {
  year: number; month: number;
  bookings: MockBooking[];
  onSelectBooking: (b: MockBooking) => void;
  onSelectDay: (d: Date) => void;
}) {
  const today = new Date();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="min-h-[120px] border-r border-b border-gray-100 bg-gray-50/50" />;
          const cellDate = new Date(year, month, day);
          const isToday = isSameDay(cellDate, today);
          const dayBookings = bookings.filter((b) => isSameDay(b.startAt, cellDate));
          return (
            <div
              key={idx}
              className={`min-h-[120px] border-r border-b border-gray-100 p-1.5 cursor-pointer hover:bg-blue-50/30 transition-colors ${isToday ? "bg-blue-50/50" : ""}`}
              onClick={() => onSelectDay(cellDate)}
            >
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                isToday ? "bg-[#1A6FFF] text-white" : "text-gray-700 hover:bg-gray-100"
              }`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayBookings.slice(0, 3).map((b) => (
                  <BookingDot key={b.id} booking={b} onClick={() => onSelectBooking(b)} />
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-gray-400 pl-1">+{dayBookings.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ weekStart, bookings, onSelectBooking }: {
  weekStart: Date;
  bookings: MockBooking[];
  onSelectBooking: (b: MockBooking) => void;
}) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am–8pm

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="py-3 text-xs text-gray-400 text-center">GMT-6</div>
        {days.map((d, i) => (
          <div key={i} className={`py-3 text-center ${isSameDay(d, today) ? "text-[#1A6FFF]" : "text-gray-600"}`}>
            <div className="text-xs font-medium uppercase">{DAY_NAMES[d.getDay()]}</div>
            <div className={`text-lg font-bold mt-0.5 w-9 h-9 flex items-center justify-center rounded-full mx-auto ${
              isSameDay(d, today) ? "bg-[#1A6FFF] text-white" : ""
            }`}>{d.getDate()}</div>
          </div>
        ))}
      </div>
      {/* Time grid */}
      <div className="relative">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-gray-100" style={{ minHeight: "60px" }}>
            <div className="py-1 pr-2 text-right text-xs text-gray-400 -mt-2.5">
              {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
            {days.map((d, di) => {
              const slotBookings = bookings.filter((b) => {
                return isSameDay(b.startAt, d) && b.startAt.getHours() === hour;
              });
              return (
                <div key={di} className="border-l border-gray-100 relative p-0.5">
                  {slotBookings.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => onSelectBooking(b)}
                      className="w-full text-left p-1.5 rounded text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: b.color + "20", color: b.color, borderLeft: `2px solid ${b.color}` }}
                    >
                      <div className="font-semibold truncate">{b.guestName.split(" ")[0]}</div>
                      <div className="opacity-80">{b.eventTitle}</div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ bookings, onSelectBooking }: { bookings: MockBooking[]; onSelectBooking: (b: MockBooking) => void }) {
  const sorted = [...bookings].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const upcoming = sorted.filter((b) => b.startAt >= new Date() && b.status !== "cancelled");
  const past = sorted.filter((b) => b.startAt < new Date() || b.status === "completed");

  const BookingRow = ({ b }: { b: MockBooking }) => {
    const LocIcon = LOCATION_ICON[b.locationType];
    return (
      <button
        onClick={() => onSelectBooking(b)}
        className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all bg-white"
      >
        <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: b.color }} />
        <div className="w-14 text-center flex-shrink-0">
          <div className="text-xs font-bold text-gray-500 uppercase">{b.startAt.toLocaleDateString("en-US", { month: "short" })}</div>
          <div className="text-2xl font-bold text-gray-900">{b.startAt.getDate()}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">{b.eventTitle}</div>
          <div className="text-sm text-gray-500 flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{b.guestName}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(b.startAt)}</span>
            <span className="flex items-center gap-1"><LocIcon className="w-3.5 h-3.5" />{b.locationType.replace("_", " ")}</span>
          </div>
        </div>
        <Badge className={`text-xs border flex-shrink-0 ${STATUS_COLORS[b.status]}`}>{b.status}</Badge>
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-auto p-4 space-y-6">
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming ({upcoming.length})</h3>
          <div className="space-y-2">{upcoming.map((b) => <BookingRow key={b.id} b={b} />)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past ({past.length})</h3>
          <div className="space-y-2 opacity-70">{past.map((b) => <BookingRow key={b.id} b={b} />)}</div>
        </div>
      )}
      {bookings.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No bookings yet</p>
          <p className="text-sm mt-1">Create your first booking or let the AI agent book for you</p>
        </div>
      )}
    </div>
  );
}

// ─── AI Booking Agent ─────────────────────────────────────────────────────────

function AIBookingAgent({ onClose }: { onClose: () => void }) {
  type ChatRole = "user" | "assistant";
  const [messages, setMessages] = useState<{ role: ChatRole; content: string }[]>([
    { role: "assistant", content: "Hi! I'm your AI Booking Agent. I can book, reschedule, or cancel appointments for you. Just tell me what you need — for example: \"Book a 30-min consultation with John Smith (john@example.com) for tomorrow at 2pm.\"" }
  ]);
  const [input, setInput] = useState("");
  const utils = trpc.useUtils();

  const agentChat = trpc.scheduler.agentChat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant" as ChatRole, content: data.content }]);
      // Refresh bookings list if a booking was created/cancelled
      if (data.action?.type === "create_booking" || data.action?.type === "cancel_booking") {
        utils.scheduler.listBookings.invalidate();
      }
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: "assistant" as ChatRole, content: "Sorry, I encountered an error. Please try again." }]);
    },
  });

  const sendMessage = () => {
    if (!input.trim() || agentChat.isPending) return;
    const userMsg = input.trim();
    setInput("");
    const updatedMessages = [...messages, { role: "user" as ChatRole, content: userMsg }];
    setMessages(updatedMessages);
    agentChat.mutate({
      messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-[#1A6FFF] to-[#0052CC]">
        <div className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI Booking Agent</div>
            <div className="text-xs text-white/70">Powered by VonWork AI</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i}             className={`flex ${(msg.role as string) === "user" ? "justify-end" : "justify-start"}`}>
            {(msg.role as string) === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-[#1A6FFF]" />
              </div>
            )}
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-line ${
              (msg.role as string) === "user"
                ? "bg-[#1A6FFF] text-white rounded-tr-sm"
                : "bg-gray-100 text-gray-800 rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {agentChat.isPending && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2">
              <Bot className="w-3.5 h-3.5 text-[#1A6FFF]" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Quick actions */}
      <div className="px-4 py-2 border-t border-gray-100">
        <div className="flex gap-1.5 flex-wrap">
          {["Check availability", "Book appointment", "Reschedule", "Cancel booking"].map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Book, reschedule, or ask about availability..."
            className="flex-1 text-sm border-gray-200 focus:border-[#1A6FFF]"
          />
          <Button size="sm" onClick={sendMessage} disabled={agentChat.isPending || !input.trim()} className="bg-[#1A6FFF] hover:bg-[#0052CC] text-white px-3">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── New Booking Dialog ───────────────────────────────────────────────────────

function NewBookingDialog({ open, onClose, selectedDate }: { open: boolean; onClose: () => void; selectedDate: Date | null }) {
  const [form, setForm] = useState({
    guestName: "", guestEmail: "", guestPhone: "",
    eventTypeId: "1", date: selectedDate ? selectedDate.toISOString().split("T")[0] : "",
    time: "09:00", notes: "",
  });

  const handleSubmit = () => {
    if (!form.guestName || !form.guestEmail || !form.date || !form.time) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success(`Booking created for ${form.guestName}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1A6FFF]" /> New Booking
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Event Type</Label>
              <Select value={form.eventTypeId} onValueChange={(v) => setForm((f) => ({ ...f, eventTypeId: v }))}>
                <SelectTrigger className="border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES_MOCK.map((et) => (
                    <SelectItem key={et.id} value={String(et.id)}>
                      {et.title} ({et.durationMinutes}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Guest Name *</Label>
              <Input value={form.guestName} onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))} placeholder="John Smith" className="border-gray-200" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Phone</Label>
              <Input value={form.guestPhone} onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))} placeholder="555-0100" className="border-gray-200" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email *</Label>
              <Input value={form.guestEmail} onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))} placeholder="john@example.com" type="email" className="border-gray-200" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Date *</Label>
              <Input value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} type="date" className="border-gray-200" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Time *</Label>
              <Input value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} type="time" className="border-gray-200" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any special notes or requirements..." rows={2} className="border-gray-200 resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1 bg-[#1A6FFF] hover:bg-[#0052CC] text-white">
              <Calendar className="w-4 h-4 mr-1.5" /> Book Appointment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulerPage() {
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedBooking, setSelectedBooking] = useState<MockBooking | null>(null);
  const [showAIAgent, setShowAIAgent] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("calendar");
  const [bookings, setBookings] = useState<MockBooking[]>(generateMockBookings);
  const [availability, setAvailability] = useState(AVAILABILITY_MOCK);

  // Week start (Sunday of current week)
  const weekStart = useMemo(() => {
    const d = new Date(currentYear, currentMonth, today.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [currentYear, currentMonth]);

  const navigatePrev = () => {
    if (viewMode === "month") {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
      else setCurrentMonth((m) => m - 1);
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
      else setCurrentMonth((m) => m + 1);
    }
  };

  const handleStatusChange = (id: number, status: BookingStatus) => {
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
    setSelectedBooking((prev) => prev?.id === id ? { ...prev, status } : prev);
    toast.success(`Booking marked as ${status}`);
  };

  const upcomingCount = bookings.filter((b) => b.startAt >= today && b.status !== "cancelled").length;
  const todayCount = bookings.filter((b) => isSameDay(b.startAt, today)).length;
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  const headerTitle = viewMode === "month"
    ? `${MONTH_NAMES[currentMonth]} ${currentYear}`
    : viewMode === "week"
    ? `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : `${today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`;

  return (
    <PageShell
      title="AI Scheduler"
      subtitle="Native booking system — no third-party dependencies"
      icon={<Calendar className="w-5 h-5" />}
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAIAgent(true)}
            className="bg-white/20 border-white/30 text-white hover:bg-white/30 text-xs"
          >
            <Bot className="w-3.5 h-3.5 mr-1.5" /> AI Agent
          </Button>
          <Button
            size="sm"
            onClick={() => setShowNewBooking(true)}
            className="bg-white text-[#1A6FFF] hover:bg-white/90 font-semibold text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Booking
          </Button>
        </div>
      }
    >
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: "Today's Bookings", value: todayCount, icon: CalendarDays, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Upcoming", value: upcomingCount, icon: Clock, color: "text-green-600", bg: "bg-green-50" },
          { label: "Pending Confirm", value: pendingCount, icon: Bell, color: "text-yellow-600", bg: "bg-yellow-50" },
        ].map((s) => (
          <Card key={s.label} className="border-gray-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-gray-100 border border-gray-200">
            <TabsTrigger value="calendar" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1A6FFF] data-[state=active]:shadow-sm">
              <Calendar className="w-3.5 h-3.5 mr-1" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="event-types" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1A6FFF] data-[state=active]:shadow-sm">
              <Zap className="w-3.5 h-3.5 mr-1" /> Event Types
            </TabsTrigger>
            <TabsTrigger value="availability" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1A6FFF] data-[state=active]:shadow-sm">
              <Clock className="w-3.5 h-3.5 mr-1" /> Availability
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            {/* Calendar toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-2">
                <button onClick={navigatePrev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-semibold text-gray-900 min-w-[180px] text-center">{headerTitle}</h2>
                <button onClick={navigateNext} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()); }}
                  className="ml-2 px-2.5 py-1 text-xs font-medium text-[#1A6FFF] bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  Today
                </button>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {([
                  { mode: "month" as ViewMode, icon: CalendarRange, label: "Month" },
                  { mode: "week" as ViewMode, icon: CalendarDays, label: "Week" },
                  { mode: "list" as ViewMode, icon: List, label: "List" },
                ]).map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === mode ? "bg-white text-[#1A6FFF] shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Calendar body */}
            <div className="min-h-[500px] flex flex-col">
              {viewMode === "month" && (
                <MonthView
                  year={currentYear}
                  month={currentMonth}
                  bookings={bookings}
                  onSelectBooking={setSelectedBooking}
                  onSelectDay={(d) => { setSelectedDate(d); setShowNewBooking(true); }}
                />
              )}
              {viewMode === "week" && (
                <WeekView weekStart={weekStart} bookings={bookings} onSelectBooking={setSelectedBooking} />
              )}
              {viewMode === "list" && (
                <ListView bookings={bookings} onSelectBooking={setSelectedBooking} />
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Event Types Tab */}
        <TabsContent value="event-types">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EVENT_TYPES_MOCK.map((et) => {
              const LocIcon = LOCATION_ICON[et.locationType as keyof typeof LOCATION_ICON];
              return (
                <Card key={et.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: et.color }} />
                      <button className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{et.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{et.durationMinutes} min</span>
                      <span className="flex items-center gap-1"><LocIcon className="w-3.5 h-3.5" />{et.locationType.replace("_", " ")}</span>
                    </div>
                    {et.price && (
                      <div className="text-sm font-semibold text-green-600">${et.price}</div>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      <Button
                        size="sm" variant="outline"
                        className="w-full text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          const slug = et.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                          const url = `${window.location.origin}/book/${slug}`;
                          navigator.clipboard.writeText(url).then(() => toast.success("Booking link copied!"));
                        }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Copy Booking Link
                      </Button>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 text-xs border-gray-200">
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" className="flex-1 text-xs bg-[#1A6FFF] hover:bg-[#0052CC] text-white">
                          <Calendar className="w-3 h-3 mr-1" /> Book
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <Card className="border-gray-200 border-dashed shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-[#1A6FFF] hover:bg-blue-50/30">
              <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[160px] text-gray-400 hover:text-[#1A6FFF]">
                <Plus className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">New Event Type</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1A6FFF]" /> Weekly Availability
              </CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">Set your working hours. Bookings will only be allowed during enabled time slots.</p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {availability.map((rule, idx) => (
                <div key={rule.day} className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${rule.enabled ? "border-blue-100 bg-blue-50/30" : "border-gray-100 bg-gray-50"}`}>
                  <div className="w-24 font-medium text-sm text-gray-700">{rule.day}</div>
                  <button
                    onClick={() => setAvailability((prev) => prev.map((r, i) => i === idx ? { ...r, enabled: !r.enabled } : r))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${rule.enabled ? "bg-[#1A6FFF]" : "bg-gray-300"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rule.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                  {rule.enabled ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={rule.start}
                        onChange={(e) => setAvailability((prev) => prev.map((r, i) => i === idx ? { ...r, start: e.target.value } : r))}
                        className="w-32 text-sm border-gray-200 h-8"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <Input
                        type="time"
                        value={rule.end}
                        onChange={(e) => setAvailability((prev) => prev.map((r, i) => i === idx ? { ...r, end: e.target.value } : r))}
                        className="w-32 text-sm border-gray-200 h-8"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Unavailable</span>
                  )}
                </div>
              ))}
              <div className="pt-2">
                <Button className="bg-[#1A6FFF] hover:bg-[#0052CC] text-white">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save Availability
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Booking detail panel */}
      {selectedBooking && !showAIAgent && (
        <BookingDetailPanel
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* AI Booking Agent panel */}
      {showAIAgent && (
        <AIBookingAgent onClose={() => setShowAIAgent(false)} />
      )}

      {/* New Booking dialog */}
      <NewBookingDialog
        open={showNewBooking}
        onClose={() => { setShowNewBooking(false); setSelectedDate(null); }}
        selectedDate={selectedDate}
      />
    </PageShell>
  );
}
