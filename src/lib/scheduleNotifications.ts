import "server-only";

type ScheduleParams = {
  sessionId: string;
  startsAtISO: string; // UTC ISO string, e.g. "2025-10-02T18:00:00Z"
  rosterUserIds: string[]; // OneSignal external user ids (we set on login)
  sessionUrl: string; // URL to open on click
  testMode?: boolean; // if true, compress 48/24/6h into ~1/2/3 minutes for quick tests
};

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const BASE_ONE_SIGNAL_API = "https://onesignal.com/api/v1/notifications";

// Replaces older notifications for the same training (no stacking)
function topicFor(sessionId: string) {
  return `training-${sessionId}`;
}

function toUTCString(d: Date) {
  return d.toUTCString(); // OneSignal expects RFC 2822 / UTC string in send_after
}

function addMinutes(d: Date, m: number) {
  return new Date(d.getTime() + m * 60_000);
}
function addHours(d: Date, h: number) {
  return new Date(d.getTime() + h * 3_600_000);
}

async function sendScheduled(body: any) {
  const res = await fetch(BASE_ONE_SIGNAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${REST_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OneSignal error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function scheduleTrainingNotifications(params: ScheduleParams) {
  const { sessionId, startsAtISO, rosterUserIds, sessionUrl, testMode } = params;
  if (!APP_ID || !REST_API_KEY) {
    return { ok: false, reason: "OneSignal env not configured" };
  }

  const start = new Date(startsAtISO);
  if (Number.isNaN(start.getTime())) {
    throw new Error("startsAtISO is not a valid date");
  }

  const topic = topicFor(sessionId);

  // Compute schedule times
  let t48 = toUTCString(addHours(start, -48));
  let t24 = toUTCString(addHours(start, -24));
  let t06 = toUTCString(addHours(start, -6));

  // Test mode: compress to near-future
  if (testMode) {
    const now = new Date();
    t48 = toUTCString(addMinutes(now, 1));
    t24 = toUTCString(addMinutes(now, 2));
    t06 = toUTCString(addMinutes(now, 3));
  }

  // 48h to ALL subscribed users
  const n48 = await sendScheduled({
    app_id: APP_ID,
    included_segments: ["Subscribed Users"],
    headings: { en: "Training reminder (48h)" },
    contents: { en: "Heads up: training in 48 hours. Tap to view details or mark availability." },
    url: sessionUrl,
    web_push_topic: topic,
    send_after: t48,
  });

  // 24h to ALL subscribed users
  const n24 = await sendScheduled({
    app_id: APP_ID,
    included_segments: ["Subscribed Users"],
    headings: { en: "Training reminder (24h)" },
    contents: { en: "Reminder: training in 24 hours. Tap to confirm or update your status." },
    url: sessionUrl,
    web_push_topic: topic,
    send_after: t24,
  });

  // 6h to ROSTER ONLY
  // Target Only those players using external user IDs
  const n06 = await sendScheduled({
    app_id: APP_ID,
    include_external_user_ids: rosterUserIds,
    headings: { en: "Training today (6h)" },
    contents: { en: "You're on today's training roster in ~6 hours. Tap to open the session." },
    url: sessionUrl,
    web_push_topic: topic,
    send_after: t06,
  });

  return { ok: true, ids: { n48, n24, n06 } };
}