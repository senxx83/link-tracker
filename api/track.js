import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // Allow CORS for the frontend
  res.setHeader("Access-Control-Allow-Origin", "*");

  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? forwarded.split(",")[0] : req.socket?.remoteAddress;

  const userAgent = req.headers["user-agent"] || "Unknown";
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Colombo",
    dateStyle: "full",
    timeStyle: "long",
  });

  // Parse device info from user agent
  let device = "Unknown Device";
  let deviceType = "Unknown";
  let browser = "Unknown Browser";

  if (/iPhone/.test(userAgent)) { device = "iPhone"; deviceType = "Mobile"; }
  else if (/iPad/.test(userAgent)) { device = "iPad"; deviceType = "Tablet"; }
  else if (/Android/.test(userAgent)) {
    const match = userAgent.match(/Android[^;]*;\s*([^)]+)/);
    device = match ? match[1].trim() : "Android Device";
    deviceType = /Mobile/.test(userAgent) ? "Mobile" : "Tablet";
  } else if (/Macintosh/.test(userAgent)) { device = "Mac"; deviceType = "Desktop"; }
  else if (/Windows/.test(userAgent)) { device = "Windows PC"; deviceType = "Desktop"; }
  else if (/Linux/.test(userAgent)) { device = "Linux PC"; deviceType = "Desktop"; }

  if (/CriOS|Chrome/.test(userAgent)) browser = "Chrome";
  else if (/FxiOS|Firefox/.test(userAgent)) browser = "Firefox";
  else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) browser = "Safari";
  else if (/EdgA|Edge/.test(userAgent)) browser = "Edge";
  else if (/Instagram/.test(userAgent)) browser = "Instagram In-App Browser";

  // Fetch location from IP
  let location = {};
  try {
    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,zip,isp`);
    const geo = await geoRes.json();
    if (geo.status === "success") {
      location = {
        country: geo.country,
        region: geo.regionName,
        city: geo.city,
        postal: geo.zip,
        isp: geo.isp,
      };
    }
  } catch (e) {
    location = { error: "Could not fetch location" };
  }

  // Build email
  const html = `
  <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#f0f0f0;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);padding:24px 28px">
      <h2 style="margin:0;font-size:22px;color:white">🔗 Link Tracker — Someone Clicked</h2>
      <p style="margin:6px 0 0;opacity:0.85;font-size:13px">${timestamp}</p>
    </div>
    <div style="padding:24px 28px">

      <div style="margin-bottom:20px">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.5">Time & Date</p>
        <p style="margin:0;font-size:15px;font-weight:600">${timestamp}</p>
      </div>

      <div style="margin-bottom:20px">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.5">IP Address</p>
        <p style="margin:0;font-size:15px;font-weight:600;font-family:monospace">${ip}</p>
      </div>

      <div style="margin-bottom:20px">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.5">Device</p>
        <p style="margin:0;font-size:15px;font-weight:600">${device} · ${deviceType} · ${browser}</p>
      </div>

      <div style="margin-bottom:20px">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.5">Location</p>
        <p style="margin:0;font-size:15px;font-weight:600">${location.city || "?"}, ${location.region || "?"}, ${location.country || "?"} ${location.postal || ""}</p>
        <p style="margin:4px 0 0;font-size:12px;opacity:0.6">ISP: ${location.isp || "Unknown"}</p>
      </div>

      <div style="margin-bottom:20px">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.5">Full User Agent</p>
        <p style="margin:0;font-size:11px;font-family:monospace;opacity:0.6;word-break:break-all">${userAgent}</p>
      </div>

    </div>
  </div>
  `;

  // Send email
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_SENDER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_SENDER,
      to: process.env.EMAIL_RECEIVER,
      subject: `🔗 Link clicked — ${location.city || "Unknown"}, ${location.country || "Unknown"} · ${device}`,
      html,
    });
  } catch (e) {
    console.error("Email error:", e.message);
  }

  res.status(200).json({ ok: true });
}
