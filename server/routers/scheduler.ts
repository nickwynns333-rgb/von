import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventType {
  id: number;
  slug: string;
  title: string;
  durationMinutes: number;
  color: string;
  locationType: "in_person" | "phone" | "video" | "other";
  price: number | null;
  description: string;
  bufferMinutes: number;
}

interface AvailabilityRule {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

interface Booking {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  startAt: Date;
  endAt: Date;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  eventTitle: string;
  eventTypeId: number;
  location?: string;
  locationType: "in_person" | "phone" | "video" | "other";
  color: string;
  bookedVia: string;
  notes?: string;
  aiSummary?: string;
  userId: number;
}

// ─── In-memory store (will be replaced with DB queries) ──────────────────────
// Using module-level maps keyed by userId so each user has their own data

const userEventTypes = new Map<number, EventType[]>();
const userAvailability = new Map<number, AvailabilityRule[]>();
const userBookings = new Map<number, Booking[]>();
let bookingIdCounter = 100;

function getDefaultEventTypes(): EventType[] {
  return [
    { id: 1, slug: "consultation-30", title: "30-min Consultation", durationMinutes: 30, color: "#1A6FFF", locationType: "video", price: null, description: "A quick 30-minute consultation call.", bufferMinutes: 5 },
    { id: 2, slug: "service-60", title: "Service Appointment", durationMinutes: 60, color: "#10B981", locationType: "in_person", price: 149, description: "On-site service appointment.", bufferMinutes: 15 },
    { id: 3, slug: "inspection-90", title: "Full Inspection", durationMinutes: 90, color: "#F59E0B", locationType: "in_person", price: 99, description: "Comprehensive inspection and assessment.", bufferMinutes: 30 },
    { id: 4, slug: "followup-15", title: "Follow-up Call", durationMinutes: 15, color: "#EC4899", locationType: "phone", price: null, description: "Quick follow-up call.", bufferMinutes: 0 },
  ];
}

function getDefaultAvailability(): AvailabilityRule[] {
  return [
    { day: "Monday", enabled: true, start: "09:00", end: "17:00" },
    { day: "Tuesday", enabled: true, start: "09:00", end: "17:00" },
    { day: "Wednesday", enabled: true, start: "09:00", end: "17:00" },
    { day: "Thursday", enabled: true, start: "09:00", end: "17:00" },
    { day: "Friday", enabled: true, start: "09:00", end: "17:00" },
    { day: "Saturday", enabled: false, start: "10:00", end: "14:00" },
    { day: "Sunday", enabled: false, start: "10:00", end: "14:00" },
  ];
}

function getUserEventTypes(userId: number): EventType[] {
  if (!userEventTypes.has(userId)) userEventTypes.set(userId, getDefaultEventTypes());
  return userEventTypes.get(userId)!;
}

function getUserAvailability(userId: number): AvailabilityRule[] {
  if (!userAvailability.has(userId)) userAvailability.set(userId, getDefaultAvailability());
  return userAvailability.get(userId)!;
}

function getUserBookings(userId: number): Booking[] {
  if (!userBookings.has(userId)) userBookings.set(userId, []);
  return userBookings.get(userId)!;
}

// ─── iCal generator ───────────────────────────────────────────────────────────

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function generateICalEvent(booking: Booking): string {
  const uid = `booking-${booking.id}@vonwork.ai`;
  const now = formatICalDate(new Date());
  const start = formatICalDate(booking.startAt);
  const end = formatICalDate(booking.endAt);
  const location = booking.location ?? booking.locationType.replace("_", " ");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VonWork AI Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${booking.eventTitle} with ${booking.guestName}`,
    `DESCRIPTION:Booked via VonWork AI Scheduler\\nGuest: ${booking.guestName} <${booking.guestEmail}>`,
    `LOCATION:${location}`,
    `STATUS:${booking.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
    `ORGANIZER;CN=VonWork:mailto:noreply@vonwork.ai`,
    `ATTENDEE;CN=${booking.guestName};RSVP=TRUE:mailto:${booking.guestEmail}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// ─── Available slots calculator ───────────────────────────────────────────────

function getAvailableSlots(
  date: Date,
  availability: AvailabilityRule[],
  durationMinutes: number,
  bufferMinutes: number,
  existingBookings: Booking[]
): { time: string; startAt: Date; endAt: Date }[] {
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const rule = availability.find((r) => r.day === dayName);
  if (!rule || !rule.enabled) return [];

  const [startH, startM] = rule.start.split(":").map(Number);
  const [endH, endM] = rule.end.split(":").map(Number);

  const slots: { time: string; startAt: Date; endAt: Date }[] = [];
  let cursor = new Date(date);
  cursor.setHours(startH, startM, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endH, endM, 0, 0);

  const totalSlotMinutes = durationMinutes + bufferMinutes;

  while (true) {
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60000);
    if (slotEnd > dayEnd) break;

    // Check for conflicts with existing bookings
    const hasConflict = existingBookings.some((b) => {
      if (b.status === "cancelled") return false;
      const bStart = new Date(b.startAt).getTime();
      const bEnd = new Date(b.endAt).getTime() + bufferMinutes * 60000;
      const sStart = cursor.getTime();
      const sEnd = slotEnd.getTime();
      return sStart < bEnd && sEnd > bStart;
    });

    if (!hasConflict) {
      slots.push({
        time: cursor.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        startAt: new Date(cursor),
        endAt: slotEnd,
      });
    }

    cursor = new Date(cursor.getTime() + totalSlotMinutes * 60000);
  }

  return slots;
}

// ─── AI Booking Agent system prompt ──────────────────────────────────────────

function buildAgentSystemPrompt(
  eventTypes: EventType[],
  availability: AvailabilityRule[],
  bookings: Booking[],
  ownerName: string
): string {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const upcomingBookings = bookings
    .filter((b) => b.startAt >= new Date() && b.status !== "cancelled")
    .slice(0, 10)
    .map((b) => `- ${b.eventTitle} with ${b.guestName} on ${new Date(b.startAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${new Date(b.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} (${b.status})`)
    .join("\n");

  const availableDays = availability.filter((r) => r.enabled).map((r) => `${r.day}: ${r.start}–${r.end}`).join(", ");
  const eventTypeList = eventTypes.map((et) => `- ${et.title} (${et.durationMinutes} min, ${et.locationType}${et.price ? `, $${et.price}` : ""})`).join("\n");

  return `You are an AI Booking Agent for ${ownerName}'s VonWork AI Scheduler. Today is ${today}.

AVAILABLE EVENT TYPES:
${eventTypeList}

WORKING HOURS:
${availableDays}

UPCOMING BOOKINGS:
${upcomingBookings || "None yet."}

YOUR CAPABILITIES:
1. Book new appointments — extract: guest name, email, phone (optional), event type, date, time, notes
2. Reschedule appointments — find by guest name or date, propose new time
3. Cancel appointments — confirm before cancelling
4. Check availability — list open slots for a given date
5. Summarize upcoming schedule

RESPONSE FORMAT:
- Be concise and friendly
- When booking: confirm all details before creating
- When you have enough info to create a booking, end your message with a JSON block like:
  ACTION: {"type": "create_booking", "guestName": "...", "guestEmail": "...", "guestPhone": "...", "eventTypeId": 1, "startAt": "2026-07-31T14:00:00", "notes": "..."}
- When cancelling: end with: ACTION: {"type": "cancel_booking", "bookingId": 5}
- For availability queries: list the open time slots clearly`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const schedulerRouter = router({
  // Get all event types for the current user
  getEventTypes: protectedProcedure.query(({ ctx }) => {
    return getUserEventTypes(ctx.user.id);
  }),

  // Get availability rules
  getAvailability: protectedProcedure.query(({ ctx }) => {
    return getUserAvailability(ctx.user.id);
  }),

  // Update availability rules
  updateAvailability: protectedProcedure
    .input(z.array(z.object({
      day: z.string(),
      enabled: z.boolean(),
      start: z.string(),
      end: z.string(),
    })))
    .mutation(({ ctx, input }) => {
      userAvailability.set(ctx.user.id, input);
      return { success: true };
    }),

  // List bookings
  listBookings: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show", "all"]).optional(),
    }).optional())
    .query(({ ctx, input }) => {
      const bookings = getUserBookings(ctx.user.id);
      if (!input?.status || input.status === "all") return bookings;
      return bookings.filter((b) => b.status === input.status);
    }),

  // Create a booking
  createBooking: protectedProcedure
    .input(z.object({
      guestName: z.string().min(1),
      guestEmail: z.string().email(),
      guestPhone: z.string().optional(),
      eventTypeId: z.number(),
      startAt: z.string(), // ISO string
      notes: z.string().optional(),
      bookedVia: z.string().default("manual"),
    }))
    .mutation(({ ctx, input }) => {
      const eventTypes = getUserEventTypes(ctx.user.id);
      const et = eventTypes.find((e) => e.id === input.eventTypeId);
      if (!et) throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });

      const startAt = new Date(input.startAt);
      const endAt = new Date(startAt.getTime() + et.durationMinutes * 60000);

      const booking: Booking = {
        id: ++bookingIdCounter,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        startAt,
        endAt,
        status: "confirmed",
        eventTitle: et.title,
        eventTypeId: et.id,
        locationType: et.locationType,
        color: et.color,
        bookedVia: input.bookedVia,
        notes: input.notes,
        userId: ctx.user.id,
      };

      const bookings = getUserBookings(ctx.user.id);
      bookings.push(booking);
      userBookings.set(ctx.user.id, bookings);

      return booking;
    }),

  // Update booking status
  updateBookingStatus: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]),
    }))
    .mutation(({ ctx, input }) => {
      const bookings = getUserBookings(ctx.user.id);
      const idx = bookings.findIndex((b) => b.id === input.bookingId);
      if (idx === -1) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      bookings[idx].status = input.status;
      userBookings.set(ctx.user.id, bookings);
      return bookings[idx];
    }),

  // Generate iCal for a booking
  getICalEvent: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(({ ctx, input }) => {
      const bookings = getUserBookings(ctx.user.id);
      const booking = bookings.find((b) => b.id === input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      return { ical: generateICalEvent(booking), filename: `booking-${booking.id}.ics` };
    }),

  // Get available time slots for a given date and event type
  getAvailableSlots: protectedProcedure
    .input(z.object({
      date: z.string(), // YYYY-MM-DD
      eventTypeId: z.number(),
    }))
    .query(({ ctx, input }) => {
      const eventTypes = getUserEventTypes(ctx.user.id);
      const et = eventTypes.find((e) => e.id === input.eventTypeId);
      if (!et) throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });

      const availability = getUserAvailability(ctx.user.id);
      const bookings = getUserBookings(ctx.user.id);
      const date = new Date(input.date + "T00:00:00");

      return getAvailableSlots(date, availability, et.durationMinutes, et.bufferMinutes, bookings);
    }),

  // Public: get event type by slug (for public booking page)
  getPublicEventType: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      // In production this would query by slug across all users
      // For now return from first user that has this slug
      for (const types of Array.from(userEventTypes.values())) {
        const et = (types as EventType[]).find((e: EventType) => e.slug === input.slug);
        if (et) return et;
      }
      // Return default if not found
      const defaults = getDefaultEventTypes();
      const et = defaults.find((e) => e.slug === input.slug);
      if (!et) throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
      return et;
    }),

  // Public: get available slots for public booking page
  getPublicSlots: publicProcedure
    .input(z.object({
      slug: z.string(),
      date: z.string(),
    }))
    .query(({ input }) => {
      const defaults = getDefaultEventTypes();
      const et = defaults.find((e) => e.slug === input.slug) ?? defaults[0];
      const availability = getDefaultAvailability();
      const date = new Date(input.date + "T00:00:00");
      return getAvailableSlots(date, availability, et.durationMinutes, et.bufferMinutes, []);
    }),

  // Public: create a booking from public page
  createPublicBooking: publicProcedure
    .input(z.object({
      slug: z.string(),
      guestName: z.string().min(1),
      guestEmail: z.string().email(),
      guestPhone: z.string().optional(),
      startAt: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const defaults = getDefaultEventTypes();
      const et = defaults.find((e) => e.slug === input.slug) ?? defaults[0];
      const startAt = new Date(input.startAt);
      const endAt = new Date(startAt.getTime() + et.durationMinutes * 60000);

      const booking: Booking = {
        id: ++bookingIdCounter,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        startAt,
        endAt,
        status: "pending",
        eventTitle: et.title,
        eventTypeId: et.id,
        locationType: et.locationType,
        color: et.color,
        bookedVia: "public_page",
        notes: input.notes,
        userId: 0, // public booking
      };

      const publicBookings = getUserBookings(0);
      publicBookings.push(booking);
      userBookings.set(0, publicBookings);

      return { success: true, bookingId: booking.id, eventTitle: et.title, startAt: booking.startAt };
    }),

  // AI Booking Agent — LLM-powered chat
  agentChat: protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const eventTypes = getUserEventTypes(ctx.user.id);
      const availability = getUserAvailability(ctx.user.id);
      const bookings = getUserBookings(ctx.user.id);
      const ownerName = ctx.user.name ?? "the business owner";

      const systemPrompt = buildAgentSystemPrompt(eventTypes, availability, bookings, ownerName);

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        ...input.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      let response;
      try {
        response = await invokeLLM({ messages: llmMessages });
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI agent unavailable" });
      }

      const rawContent = response?.choices?.[0]?.message?.content;
      const content: string = typeof rawContent === "string" ? rawContent : "I'm sorry, I couldn't process that request.";

      // Parse ACTION blocks from the response
      let action: { type: string; [key: string]: unknown } | null = null;
      const actionMatch = content.match(/ACTION:\s*(\{[\s\S]*?\})/);
      if (actionMatch) {
        try {
          action = JSON.parse(actionMatch[1]);
        } catch {
          // ignore parse errors
        }
      }

      // Execute the action if present
      let actionResult: string | null = null;
      if (action?.type === "create_booking" && action.guestName && action.guestEmail && action.startAt) {
        try {
          const et = eventTypes.find((e) => e.id === (action!.eventTypeId as number)) ?? eventTypes[0];
          const startAt = new Date(action.startAt as string);
          const endAt = new Date(startAt.getTime() + et.durationMinutes * 60000);
          const newBooking: Booking = {
            id: ++bookingIdCounter,
            guestName: action.guestName as string,
            guestEmail: action.guestEmail as string,
            guestPhone: action.guestPhone as string | undefined,
            startAt,
            endAt,
            status: "confirmed",
            eventTitle: et.title,
            eventTypeId: et.id,
            locationType: et.locationType,
            color: et.color,
            bookedVia: "ai_agent",
            notes: action.notes as string | undefined,
            userId: ctx.user.id,
          };
          const userBkgs = getUserBookings(ctx.user.id);
          userBkgs.push(newBooking);
          userBookings.set(ctx.user.id, userBkgs);
          actionResult = `✅ Booking #${newBooking.id} created successfully!`;
        } catch {
          actionResult = "⚠️ I tried to create the booking but encountered an error.";
        }
      } else if (action?.type === "cancel_booking" && action.bookingId) {
        const userBkgs = getUserBookings(ctx.user.id);
        const idx = userBkgs.findIndex((b) => b.id === (action!.bookingId as number));
        if (idx !== -1) {
          userBkgs[idx].status = "cancelled";
          userBookings.set(ctx.user.id, userBkgs);
          actionResult = `❌ Booking #${action.bookingId} has been cancelled.`;
        }
      }

      // Clean the response text (remove ACTION: block)
      const cleanContent = content.replace(/ACTION:\s*\{[\s\S]*?\}/g, "").trim();

      return {
        content: actionResult ? `${cleanContent}\n\n${actionResult}` : cleanContent,
        action,
      };
    }),
});
