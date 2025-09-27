import "server-only";

type ScheduleParams = {
  sessionId: string;
  startsAtISO: string;     // UTC ISO
  sessionUrl: string;      // deep link for the click
  testMode?: boolean;      // keep this for fast tests
};

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const BASE = "https://onesignal.com/api/v1/notifications";

function topicFor(sessionId: string) { return `training-${sessionId}`; }
function toUTCString(d: Date) { return d.toUTCString(); }
const addH = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);
const addM = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

async function send(body: any) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${REST_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OneSignal ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function scheduleTrainingNotifications(params: ScheduleParams) {
  const { sessionId, startsAtISO, sessionUrl, testMode } = params;
  if (!APP_ID || !REST_API_KEY) return { ok: false, reason: "OneSignal env not configured" };

  const start = new Date(startsAtISO);
  if (Number.isNaN(start.getTime())) throw new Error("startsAtISO invalid");

  let t48 = toUTCString(addH(start, -48));
  let t24 = toUTCString(addH(start, -24));
  let t06 = toUTCString(addH(start, -6));
  if (testMode) {
    const now = new Date();
    t48 = toUTCString(addM(now, 1));
    t24 = toUTCString(addM(now, 2));
    t06 = toUTCString(addM(now, 3));
  }

  const topic = topicFor(sessionId);

  // 48h to ALL
  const n48 = await send({
    app_id: APP_ID,
    included_segments: ["Subscribed Users"],
    headings: { en: "Training in 48h" },
    contents: { en: "Heads up: training in 48 hours. Tap to view or update your status." },
    url: sessionUrl,
    web_push_topic: topic,
    send_after: t48,
  });

  // 24h to ALL
  const n24 = await send({
    app_id: APP_ID,
    included_segments: ["Subscribed Users"],
    headings: { en: "Training in 24h" },
    contents: { en: "Reminder: training in 24 hours. Tap for details." },
    url: sessionUrl,
    web_push_topic: topic,
    send_after: t24,
  });

  // 6h to ALL (simplified)
  const n06 = await send({
    app_id: APP_ID,
    included_segments: ["Subscribed Users"],
    headings: { en: "Training today" },
    contents: { en: "Training starts in ~6 hours. Tap to open the session." },
    url: sessionUrl,
    web_push_topic: topic,
    send_after: t06,
  });

  return { ok: true, ids: { n48, n24, n06 } };
}

// Optional: immediate send, to ALL only
export async function sendImmediateAll(params: {
  sessionId: string;
  sessionUrl: string;
  title?: string;
  message?: string;
}) {
  const { sessionUrl, title, message } = params;

  // Try multiple targeting approaches
  const res = await send({
    app_id: APP_ID,
    included_segments: ["Subscribed Users"],
    headings: { en: title ?? "Training update" },
    contents: { en: message ?? "Tap to open the session" },
    url: sessionUrl,
  });
  return { ok: true, data: res };
}

export async function sendToDevice(params: {
  deviceId: string;
  sessionUrl: string;
  title?: string;
  message?: string;
}) {
  const { deviceId, sessionUrl, title, message } = params;
  const res = await send({
    app_id: APP_ID,
    include_player_ids: [deviceId],
    headings: { en: title ?? "Training update" },
    contents: { en: message ?? "Tap to open the session" },
    url: sessionUrl,
  });
  return { ok: true, data: res };
}