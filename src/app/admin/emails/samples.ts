import type { EmailType } from "@/lib/email";

// Sample data used for both the /admin/emails previews and "send test to me".
export const SAMPLE_DATA: Record<EmailType, Record<string, unknown>> = {
  welcome: {
    firstName: "Maria",
    allAccess: false,
    editions: ["CSMSv8", "CSMSv9", "CSMSv12"],
  },
  event_registered: {
    eventTitle: "Catholic Social Media Summit v16",
    slug: "csms-v16",
    startAt: "2026-11-15T01:00:00Z", // 9:00 AM Asia/Manila
    endAt: "2026-11-15T09:00:00Z",
    isOnline: true,
    venue: null,
    joinLink: "https://youtube.com/live/example",
  },
  order_paid: {
    orderRef: "A1B2C3D4",
    eventTitle: "Catholic Social Media Summit v16",
    slug: "csms-v16",
    quantity: 3,
    amountCentavos: 750000,
    paidAt: "2026-10-01T05:30:00Z",
    paymentMethod: "GCash",
    startAt: "2026-11-15T01:00:00Z",
    endAt: "2026-11-15T09:00:00Z",
    isOnline: true,
    venue: null,
    joinLink: "https://youtube.com/live/example",
    groupId: "00000000-0000-0000-0000-000000000000",
  },
  group_joined: {
    memberName: "Juan dela Cruz",
    groupName: "St. Mary Parish Group",
    seatsUsed: 3,
    seatsTotal: 5,
    groupId: "00000000-0000-0000-0000-000000000000",
  },
};

export const EMAIL_TYPES: { type: EmailType; label: string }[] = [
  { type: "welcome", label: "Welcome" },
  { type: "event_registered", label: "Event registered (free)" },
  { type: "order_paid", label: "Order paid (tickets)" },
  { type: "group_joined", label: "Group joined" },
];
