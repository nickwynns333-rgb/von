/**
 * Appointment Engine — unit tests
 * Tests booking validation, follow-up sequence logic, and reminder timing.
 */
import { describe, it, expect } from "vitest";

// ─── Helpers (inline) ─────────────────────────────────────────────────────────

type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
type SequenceType = "reminder" | "follow_up" | "upsell" | "re_engagement" | "review_request" | "referral_ask";

interface Appointment {
  id: number;
  scheduledAt: Date;
  status: AppointmentStatus;
  customerName: string;
  customerPhone: string;
}

interface SequenceStep {
  delayHours: number;
  channel: "sms" | "email" | "call";
  messageTemplate: string;
}

function buildReminderSequence(appointmentDate: Date): Array<{ sendAt: Date; channel: string }> {
  const steps = [
    { hoursBeforeAppt: 24, channel: "sms" },
    { hoursBeforeAppt: 2, channel: "call" },
    { hoursBeforeAppt: 1, channel: "sms" },
  ];
  return steps.map((s) => ({
    sendAt: new Date(appointmentDate.getTime() - s.hoursBeforeAppt * 60 * 60 * 1000),
    channel: s.channel,
  }));
}

function buildFollowUpSequence(completedAt: Date): Array<{ sendAt: Date; channel: string }> {
  const steps = [
    { hoursAfter: 2, channel: "sms" },   // "How was your visit?"
    { hoursAfter: 48, channel: "email" }, // Review request
    { hoursAfter: 720, channel: "sms" },  // 30-day upsell
  ];
  return steps.map((s) => ({
    sendAt: new Date(completedAt.getTime() + s.hoursAfter * 60 * 60 * 1000),
    channel: s.channel,
  }));
}

function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{9,14}$/.test(phone.replace(/[\s\-().]/g, ""));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function canScheduleAppointment(
  requestedAt: Date,
  existingAppointments: Appointment[],
  bufferMinutes = 30
): { canBook: boolean; reason?: string } {
  const bufferMs = bufferMinutes * 60 * 1000;
  const conflict = existingAppointments.find(
    (a) =>
      a.status !== "cancelled" &&
      Math.abs(a.scheduledAt.getTime() - requestedAt.getTime()) < bufferMs
  );
  if (conflict) return { canBook: false, reason: "time_conflict" };
  if (requestedAt < new Date()) return { canBook: false, reason: "past_date" };
  return { canBook: true };
}

function getSequenceLabel(type: SequenceType): string {
  const labels: Record<SequenceType, string> = {
    reminder: "Appointment Reminder",
    follow_up: "Post-Service Follow-Up",
    upsell: "Upsell / Inspection Offer",
    re_engagement: "Re-Engagement",
    review_request: "Review Request",
    referral_ask: "Referral Ask",
  };
  return labels[type];
}

// ─── Reminder sequence ────────────────────────────────────────────────────────
describe("Appointment Reminder Sequence", () => {
  it("generates 3 reminder steps", () => {
    const appt = new Date("2025-06-15T10:00:00Z");
    const reminders = buildReminderSequence(appt);
    expect(reminders).toHaveLength(3);
  });

  it("first reminder is 24h before appointment", () => {
    const appt = new Date("2025-06-15T10:00:00Z");
    const reminders = buildReminderSequence(appt);
    const diffHours = (appt.getTime() - reminders[0].sendAt.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBe(24);
  });

  it("second reminder is 2h before appointment (call)", () => {
    const appt = new Date("2025-06-15T10:00:00Z");
    const reminders = buildReminderSequence(appt);
    const diffHours = (appt.getTime() - reminders[1].sendAt.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBe(2);
    expect(reminders[1].channel).toBe("call");
  });

  it("third reminder is 1h before appointment (sms)", () => {
    const appt = new Date("2025-06-15T10:00:00Z");
    const reminders = buildReminderSequence(appt);
    const diffHours = (appt.getTime() - reminders[2].sendAt.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBe(1);
    expect(reminders[2].channel).toBe("sms");
  });

  it("all reminders are before the appointment", () => {
    const appt = new Date("2025-06-15T10:00:00Z");
    const reminders = buildReminderSequence(appt);
    reminders.forEach((r) => expect(r.sendAt < appt).toBe(true));
  });
});

// ─── Follow-up sequence ───────────────────────────────────────────────────────
describe("Post-Service Follow-Up Sequence", () => {
  it("generates 3 follow-up steps", () => {
    const completed = new Date("2025-06-15T11:00:00Z");
    const steps = buildFollowUpSequence(completed);
    expect(steps).toHaveLength(3);
  });

  it("first follow-up is 2h after completion (sms)", () => {
    const completed = new Date("2025-06-15T11:00:00Z");
    const steps = buildFollowUpSequence(completed);
    const diffHours = (steps[0].sendAt.getTime() - completed.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBe(2);
    expect(steps[0].channel).toBe("sms");
  });

  it("review request is 48h after completion (email)", () => {
    const completed = new Date("2025-06-15T11:00:00Z");
    const steps = buildFollowUpSequence(completed);
    const diffHours = (steps[1].sendAt.getTime() - completed.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBe(48);
    expect(steps[1].channel).toBe("email");
  });

  it("30-day upsell is 720h after completion", () => {
    const completed = new Date("2025-06-15T11:00:00Z");
    const steps = buildFollowUpSequence(completed);
    const diffHours = (steps[2].sendAt.getTime() - completed.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBe(720);
  });

  it("all follow-ups are after completion", () => {
    const completed = new Date("2025-06-15T11:00:00Z");
    const steps = buildFollowUpSequence(completed);
    steps.forEach((s) => expect(s.sendAt > completed).toBe(true));
  });
});

// ─── Booking validation ───────────────────────────────────────────────────────
describe("Appointment Booking Validation", () => {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  it("allows booking with no conflicts", () => {
    const result = canScheduleAppointment(future, []);
    expect(result.canBook).toBe(true);
  });

  it("rejects booking in the past", () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const result = canScheduleAppointment(past, []);
    expect(result.canBook).toBe(false);
    expect(result.reason).toBe("past_date");
  });

  it("rejects booking within buffer of existing appointment", () => {
    const existing: Appointment = {
      id: 1,
      scheduledAt: future,
      status: "scheduled",
      customerName: "Alice",
      customerPhone: "+15551234567",
    };
    const tooClose = new Date(future.getTime() + 15 * 60 * 1000); // 15 min later
    const result = canScheduleAppointment(tooClose, [existing], 30);
    expect(result.canBook).toBe(false);
    expect(result.reason).toBe("time_conflict");
  });

  it("allows booking after buffer window", () => {
    const existing: Appointment = {
      id: 1,
      scheduledAt: future,
      status: "scheduled",
      customerName: "Alice",
      customerPhone: "+15551234567",
    };
    const afterBuffer = new Date(future.getTime() + 45 * 60 * 1000); // 45 min later
    const result = canScheduleAppointment(afterBuffer, [existing], 30);
    expect(result.canBook).toBe(true);
  });

  it("ignores cancelled appointments for conflict check", () => {
    const cancelled: Appointment = {
      id: 2,
      scheduledAt: future,
      status: "cancelled",
      customerName: "Bob",
      customerPhone: "+15559876543",
    };
    const result = canScheduleAppointment(future, [cancelled]);
    expect(result.canBook).toBe(true);
  });
});

// ─── Contact validation ───────────────────────────────────────────────────────
describe("Customer Contact Validation", () => {
  it("validates US phone numbers", () => {
    expect(isValidPhone("+15551234567")).toBe(true);
    expect(isValidPhone("555-123-4567")).toBe(true);
    expect(isValidPhone("(555) 123-4567")).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    expect(isValidPhone("123")).toBe(false);
    expect(isValidPhone("not-a-phone")).toBe(false);
  });

  it("validates email addresses", () => {
    expect(isValidEmail("patient@example.com")).toBe(true);
    expect(isValidEmail("john.doe+tag@clinic.org")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@nodomain.com")).toBe(false);
    expect(isValidEmail("missing@")).toBe(false);
  });
});

// ─── Sequence type labels ─────────────────────────────────────────────────────
describe("Sequence Type Labels", () => {
  it("returns correct label for all 6 sequence types", () => {
    const types: SequenceType[] = ["reminder", "follow_up", "upsell", "re_engagement", "review_request", "referral_ask"];
    types.forEach((t) => {
      const label = getSequenceLabel(t);
      expect(label.length).toBeGreaterThan(0);
      expect(typeof label).toBe("string");
    });
  });

  it("reminder label contains 'Reminder'", () => {
    expect(getSequenceLabel("reminder")).toContain("Reminder");
  });

  it("follow_up label contains 'Follow'", () => {
    expect(getSequenceLabel("follow_up")).toContain("Follow");
  });
});
