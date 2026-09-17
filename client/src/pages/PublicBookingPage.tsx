import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, MapPin, Phone, Video, CheckCircle2,
  ChevronLeft, ChevronRight, Bot, Zap,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const LOCATION_ICONS = {
  in_person: MapPin,
  phone: Phone,
  video: Video,
  other: MapPin,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "consultation-30";

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; startAt: string } | null>(null);
  const [step, setStep] = useState<"date" | "time" | "form" | "success">("date");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch event type
  const { data: eventType, isLoading: etLoading } = trpc.scheduler.getPublicEventType.useQuery({ slug });

  // Fetch available slots for selected date
  const dateStr = selectedDate ? toDateString(selectedDate) : "";
  const { data: slots, isLoading: slotsLoading } = trpc.scheduler.getPublicSlots.useQuery(
    { slug, date: dateStr },
    { enabled: !!selectedDate && !!dateStr }
  );

  // Create booking mutation
  const createBooking = trpc.scheduler.createPublicBooking.useMutation({
    onSuccess: () => setStep("success"),
    onError: (err) => toast.error(err.message ?? "Booking failed. Please try again."),
  });

  // Calendar grid
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const isPastDay = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const handleDayClick = (day: number) => {
    if (isPastDay(day)) return;
    const d = new Date(calYear, calMonth, day);
    setSelectedDate(d);
    setSelectedSlot(null);
    setStep("time");
  };

  const handleSlotClick = (slot: { time: string; startAt: Date }) => {
    setSelectedSlot({ time: slot.time, startAt: slot.startAt.toISOString() });
    setStep("form");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm() || !selectedSlot) return;
    createBooking.mutate({
      slug,
      guestName: form.name,
      guestEmail: form.email,
      guestPhone: form.phone || undefined,
      startAt: selectedSlot.startAt,
      notes: form.notes || undefined,
    });
  };

  if (etLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#1A6FFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading booking page...</p>
        </div>
      </div>
    );
  }

  if (!eventType) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700">Booking page not found</h2>
          <p className="text-sm text-gray-500 mt-1">This booking link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  const LocIcon = LOCATION_ICONS[eventType.locationType as keyof typeof LOCATION_ICONS] ?? MapPin;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: eventType.color + "20" }}>
            <Zap className="w-4 h-4" style={{ color: eventType.color }} />
          </div>
          <span className="font-bold text-gray-900 text-lg">VonWork</span>
          <span className="text-gray-300 mx-1">|</span>
          <span className="text-gray-500 text-sm">AI Scheduler</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left — Event Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: eventType.color + "15" }}>
                <Calendar className="w-6 h-6" style={{ color: eventType.color }} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{eventType.title}</h1>
              <p className="text-sm text-gray-500 mb-4">{eventType.description}</p>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{eventType.durationMinutes} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <LocIcon className="w-4 h-4 text-gray-400" />
                  <span className="capitalize">{eventType.locationType.replace("_", " ")}</span>
                </div>
                {eventType.price && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-4 h-4 text-gray-400 font-bold text-center">$</span>
                    <span>${eventType.price}</span>
                  </div>
                )}
              </div>

              {/* Progress steps */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="space-y-2">
                  {[
                    { key: "date", label: "Select Date" },
                    { key: "time", label: "Pick a Time" },
                    { key: "form", label: "Your Details" },
                    { key: "success", label: "Confirmed" },
                  ].map((s, i) => {
                    const steps = ["date", "time", "form", "success"];
                    const currentIdx = steps.indexOf(step);
                    const stepIdx = steps.indexOf(s.key);
                    const isDone = stepIdx < currentIdx;
                    const isCurrent = stepIdx === currentIdx;
                    return (
                      <div key={s.key} className={`flex items-center gap-2.5 text-sm ${isCurrent ? "text-gray-900 font-semibold" : isDone ? "text-green-600" : "text-gray-400"}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isDone ? "bg-green-100 text-green-600" : isCurrent ? "text-white" : "bg-gray-100 text-gray-400"
                        }`} style={isCurrent ? { backgroundColor: eventType.color } : {}}>
                          {isDone ? "✓" : i + 1}
                        </div>
                        {s.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI badge */}
              <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                <Bot className="w-3.5 h-3.5" />
                <span>Powered by VonWork AI Scheduler</span>
              </div>
            </div>
          </div>

          {/* Right — Main content */}
          <div className="lg:col-span-2">

            {/* Step: Select Date */}
            {step === "date" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Date</h2>
                {/* Calendar nav */}
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-gray-900">{MONTH_NAMES[calMonth]} {calYear}</span>
                  <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                  ))}
                </div>
                {/* Cells */}
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, idx) => {
                    if (!day) return <div key={idx} />;
                    const cellDate = new Date(calYear, calMonth, day);
                    const isToday = isSameDay(cellDate, today);
                    const isPast = isPastDay(day);
                    const isSelected = selectedDate && isSameDay(cellDate, selectedDate);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleDayClick(day)}
                        disabled={isPast}
                        className={`h-10 w-full rounded-xl text-sm font-medium transition-all ${
                          isPast ? "text-gray-300 cursor-not-allowed" :
                          isSelected ? "text-white shadow-sm" :
                          isToday ? "border-2 text-gray-900 hover:text-white" :
                          "text-gray-700 hover:text-white"
                        }`}
                        style={
                          isSelected ? { backgroundColor: eventType.color } :
                          isToday ? { borderColor: eventType.color, color: eventType.color } :
                          !isPast ? { ["--hover-bg" as string]: eventType.color } : {}
                        }
                        onMouseEnter={(e) => { if (!isPast && !isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = eventType.color; }}
                        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ""; }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step: Pick a Time */}
            {step === "time" && selectedDate && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => setStep("date")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </h2>
                </div>

                {slotsLoading ? (
                  <div className="py-12 text-center">
                    <div className="w-8 h-8 border-2 border-[#1A6FFF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Loading available times...</p>
                  </div>
                ) : !slots || slots.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium text-gray-600">No available times</p>
                    <p className="text-sm text-gray-400 mt-1">Please select a different date.</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setStep("date")}>
                      Choose Another Date
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slots.map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => handleSlotClick(slot)}
                        className="py-3 px-4 rounded-xl border-2 text-sm font-semibold text-gray-700 border-gray-200 hover:border-[#1A6FFF] hover:text-[#1A6FFF] hover:bg-blue-50 transition-all"
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step: Your Details */}
            {step === "form" && selectedDate && selectedSlot && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => setStep("time")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Your Details</h2>
                    <p className="text-sm text-gray-500">
                      {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {selectedSlot.time}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Full Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="John Smith"
                      className={`mt-1 ${formErrors.name ? "border-red-400" : "border-gray-200"}`}
                    />
                    {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email Address *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="john@example.com"
                      className={`mt-1 ${formErrors.email ? "border-red-400" : "border-gray-200"}`}
                    />
                    {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Phone Number <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="(555) 000-0000"
                      className="mt-1 border-gray-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Anything you'd like us to know before the appointment..."
                      rows={3}
                      className="mt-1 border-gray-200 resize-none"
                    />
                  </div>

                  {/* Summary */}
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking Summary</p>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{selectedSlot.time} · {eventType.durationMinutes} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <LocIcon className="w-4 h-4 text-gray-400" />
                      <span className="capitalize">{eventType.locationType.replace("_", " ")}</span>
                    </div>
                    {eventType.price && (
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <span className="w-4 h-4 text-gray-400 font-bold text-center">$</span>
                        <span>${eventType.price}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full text-white font-semibold py-3"
                    style={{ backgroundColor: eventType.color }}
                    onClick={handleSubmit}
                    disabled={createBooking.isPending}
                  >
                    {createBooking.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Confirming...
                      </span>
                    ) : "Confirm Booking"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Success */}
            {step === "success" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">You're Booked!</h2>
                <p className="text-gray-500 mb-1">
                  <span className="font-semibold text-gray-800">{eventType.title}</span>
                </p>
                {selectedDate && selectedSlot && (
                  <p className="text-gray-500 mb-6">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {selectedSlot.time}
                  </p>
                )}
                <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3 mb-6">
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Pending Confirmation</Badge>
                  <span>A confirmation will be sent to <strong>{form.email}</strong></span>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    className="text-sm border-gray-200"
                    onClick={() => {
                      setStep("date");
                      setSelectedDate(null);
                      setSelectedSlot(null);
                      setForm({ name: "", email: "", phone: "", notes: "" });
                    }}
                  >
                    Book Another
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
