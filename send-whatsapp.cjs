
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const from = "whatsapp:+14155238886";
const to = "whatsapp:+254795333004";

// SID copied from your Twilio Tryout Order Notifications template
const contentSid = "HX350d429d32e64a552466cafecbe95f3c";

async function sendWhatsApp() {
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials are missing.");
  }

  const auth = Buffer.from(
    `${accountSid}:${authToken}`
  ).toString("base64");

  // Trial test: no ContentVariables or custom message body.
  const form = new URLSearchParams({
    From: from,
    To: to,
    ContentSid: contentSid
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form.toString()
    }
  );

  const raw = await response.text();

  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error("Unexpected Twilio response: " + raw);
  }

  if (!response.ok) {
    console.error("WhatsApp sending failed.");
    console.error("HTTP status:", response.status);
    console.error("Error code:", result.code);
    console.error("Message:", result.message);
    return;
  }

  console.log("WhatsApp message accepted!");
  console.log("Message SID:", result.sid);
  console.log("Message status:", result.status);
}

sendWhatsApp().catch(error => {
  console.error("Test failed:", error.message);
});
