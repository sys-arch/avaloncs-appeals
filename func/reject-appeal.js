import fetch from "node-fetch";

import { decodeJwt } from "./helpers/jwt-helpers.js";
import { API_ENDPOINT } from "./helpers/discord-helpers.js";
import { sendAppealRejectedEmail } from "./helpers/email-helpers.js";

async function getOriginalMessage(messageId) {
    const response = await fetch(
        `${API_ENDPOINT}/channels/${encodeURIComponent(process.env.APPEALS_CHANNEL)}/messages/${encodeURIComponent(messageId)}`,
        {
            method: "GET",
            headers: {
                "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.log(data);
        throw new Error("Failed to get original appeal message");
    }

    return data;
}

function isAppealStillOpen(message) {
    return Array.isArray(message.components) && message.components.length > 0;
}

async function disableOriginalMessageButtons(messageId) {
    const response = await fetch(
        `${API_ENDPOINT}/channels/${encodeURIComponent(process.env.APPEALS_CHANNEL)}/messages/${encodeURIComponent(messageId)}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`
            },
            body: JSON.stringify({
                components: []
            })
        }
    );

    if (!response.ok) {
        console.log(await response.json());
        throw new Error("Failed to disable original appeal buttons");
    }
}

async function postRejectionEmbed({ userId, username, email, reason }) {
    const response = await fetch(
        `${API_ENDPOINT}/channels/${encodeURIComponent(process.env.APPEALS_CHANNEL)}/messages`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`
            },
            body: JSON.stringify({
                embeds: [{
                    title: "Appeal rejected",
                    color: 0xef4444,
                    timestamp: new Date().toISOString(),
                    fields: [
                        {
                            name: "User",
                            value: `<@${userId}> (${username || "Unknown"})`
                        },
                        {
                            name: "Email",
                            value: email || "Not available"
                        },
                        {
                            name: "Reason",
                            value: reason.slice(0, 1024)
                        }
                    ]
                }]
            })
        }
    );

    if (!response.ok) {
        console.log(await response.json());
        throw new Error("Failed to post rejection embed");
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderPage({ token, error = "", reason = "" }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>Reject Appeal</title>

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<style>
:root {
    --bg-main: #070a12;
    --card: rgba(14, 19, 31, 0.94);
    --border: rgba(255,255,255,0.08);
    --text: #eef3ff;
    --muted: #9aa8c7;
    --danger: #ef4444;
    --danger-soft: rgba(239,68,68,0.12);
    --danger-border: rgba(239,68,68,0.22);
    --shadow: 0 24px 60px rgba(0,0,0,0.42);
    --radius-xl: 26px;
    --radius-lg: 18px;
    --radius-md: 14px;
}

* {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    padding: 0;
    min-height: 100%;
}

body {
    font-family: "Inter", sans-serif;
    color: var(--text);
    background:
        radial-gradient(circle at top left, rgba(239,68,68,0.10), transparent 30%),
        radial-gradient(circle at top right, rgba(245,158,11,0.08), transparent 26%),
        linear-gradient(180deg, #060910 0%, #0b101b 100%);
    overflow-x: hidden;
}

body::before,
body::after {
    content: "";
    position: fixed;
    border-radius: 50%;
    filter: blur(100px);
    pointer-events: none;
    z-index: 0;
}

body::before {
    width: 280px;
    height: 280px;
    left: -80px;
    top: 60px;
    background: rgba(239,68,68,0.10);
}

body::after {
    width: 320px;
    height: 320px;
    right: -120px;
    bottom: 20px;
    background: rgba(245,158,11,0.08);
}

.page {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.card {
    width: min(820px, 100%);
    background: linear-gradient(180deg, rgba(18,25,40,0.95) 0%, rgba(12,17,28,0.96) 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow);
    overflow: hidden;
}

.card-top {
    padding: 28px 26px 18px;
    border-bottom: 1px solid var(--border);
}

.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--danger-soft);
    border: 1px solid var(--danger-border);
    color: #ff9b9b;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

h1 {
    margin: 14px 0 10px;
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.04;
    letter-spacing: -0.03em;
}

.lead {
    margin: 0;
    color: var(--muted);
    line-height: 1.8;
    max-width: 720px;
}

.notice {
    margin-top: 18px;
    padding: 16px 16px 14px;
    border-radius: var(--radius-lg);
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
}

.notice p {
    margin: 0;
    color: var(--muted);
    line-height: 1.7;
}

.form-wrap {
    padding: 22px 26px 26px;
}

label {
    display: block;
    margin-bottom: 8px;
    font-weight: 700;
    color: #fff;
}

.help {
    margin: 0 0 12px;
    color: var(--muted);
    line-height: 1.65;
    font-size: 0.95rem;
}

textarea {
    width: 100%;
    min-height: 220px;
    resize: vertical;
    border-radius: var(--radius-md);
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(8,11,18,0.88);
    color: #fff;
    padding: 16px;
    font: inherit;
    line-height: 1.7;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

textarea::placeholder {
    color: #7c88a8;
}

textarea:focus {
    border-color: rgba(239,68,68,0.55);
    box-shadow: 0 0 0 4px rgba(239,68,68,0.10);
}

.footer {
    margin-top: 10px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.86rem;
    color: var(--muted);
}

.remaining.low {
    color: #ff8b8b;
}

.error {
    min-height: 1.3em;
    margin-top: 8px;
    color: #ff8b8b;
    font-size: 0.92rem;
    line-height: 1.45;
}

.actions {
    margin-top: 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
}

.actions-note {
    color: var(--muted);
    font-size: 0.92rem;
    line-height: 1.6;
    max-width: 540px;
}

button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 54px;
    padding: 0 22px;
    border: 0;
    border-radius: 14px;
    background: linear-gradient(180deg, #f05b5b 0%, #dc2626 100%);
    color: #fff;
    font-weight: 800;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: 0 14px 30px rgba(239,68,68,0.24);
    transition: transform 0.2s ease, filter 0.2s ease, opacity 0.2s ease;
}

button:hover {
    transform: translateY(-2px);
    filter: brightness(1.03);
}

button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
}

@media (max-width: 640px) {
    .page {
        padding: 14px;
    }

    .card-top,
    .form-wrap {
        padding-left: 16px;
        padding-right: 16px;
    }

    .actions {
        align-items: stretch;
    }

    button {
        width: 100%;
    }

    .footer {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
</head>
<body>
<main class="page">
    <section class="card">
        <div class="card-top">
            <span class="badge">Reject Appeal</span>
            <h1>Appeal Rejection Form</h1>
            <p class="lead">
                Provide a clear and professional reason for rejecting this appeal. The reason entered here will be emailed to the user and recorded in Discord.
            </p>

            <div class="notice">
                <p>
                    Keep the explanation factual, concise and specific. Avoid internal notes, jokes or comments that should not be sent to the user.
                </p>
            </div>
        </div>

        <div class="form-wrap">
            <form method="post" id="rejectForm">
                <input type="hidden" name="token" value="${escapeHtml(token)}">

                <label for="reason">Reason for rejection</label>
                <p class="help">
                    Explain why the appeal has been rejected and include the main factors considered by staff.
                </p>

                <textarea id="reason" name="reason" required minlength="20" maxlength="1800" placeholder="Write the rejection reason here...">${escapeHtml(reason)}</textarea>

                <div class="footer">
                    <span>Minimum 20 characters</span>
                    <span class="remaining" id="remainingLength"></span>
                </div>

                <div class="error" id="errorBox">${escapeHtml(error)}</div>

                <div class="actions">
                    <p class="actions-note">
                        Once submitted, the appeal will be marked as rejected, the original action buttons will be disabled, and the rejection email will be sent if an address is available.
                    </p>
                    <button type="submit" id="submitButton">Reject Appeal</button>
                </div>
            </form>
        </div>
    </section>
</main>

<script>
const textarea = document.getElementById("reason");
const remaining = document.getElementById("remainingLength");
const errorBox = document.getElementById("errorBox");
const form = document.getElementById("rejectForm");
const button = document.getElementById("submitButton");

function updateUI() {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";

    const maxLength = Number(textarea.maxLength || 0);
    const left = maxLength - textarea.value.length;

    remaining.textContent = left + " characters left";

    if (left <= 120) {
        remaining.classList.add("low");
    } else {
        remaining.classList.remove("low");
    }
}

updateUI();

textarea.addEventListener("input", () => {
    updateUI();
    if (textarea.value.trim().length >= 20) {
        errorBox.textContent = "";
    }
});

form.addEventListener("submit", event => {
    if (textarea.value.trim().length < 20) {
        event.preventDefault();
        errorBox.textContent = "Please provide a more detailed rejection reason.";
        textarea.focus();
        return;
    }

    button.disabled = true;
    button.textContent = "Submitting...";
});
</script>
</body>
</html>`;
}

export async function handler(event, context) {
    if (event.httpMethod === "GET") {
        const token = event.queryStringParameters?.token;

        if (!token) {
            return {
                statusCode: 400,
                body: "Missing token"
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8"
            },
            body: renderPage({ token })
        };
    }

    if (event.httpMethod === "POST") {
        const params = new URLSearchParams(event.body);
        const token = params.get("token");
        const reason = (params.get("reason") || "").trim();

        if (!token) {
            return {
                statusCode: 400,
                body: "Missing token"
            };
        }

        if (reason.length < 20) {
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "text/html; charset=utf-8"
                },
                body: renderPage({
                    token,
                    error: "Please provide a more detailed rejection reason.",
                    reason
                })
            };
        }

        try {
            const rejectInfo = decodeJwt(token);

            if (!rejectInfo.userId || !rejectInfo.sourceMessageId) {
                return {
                    statusCode: 400,
                    body: "Invalid token payload"
                };
            }

            const originalMessage = await getOriginalMessage(rejectInfo.sourceMessageId);

            if (!isAppealStillOpen(originalMessage)) {
                return {
                    statusCode: 303,
                    headers: {
                        "Location": `/error?msg=${encodeURIComponent("This appeal has already been processed")}`
                    }
                };
            }

            try {
                if (rejectInfo.email) {
                    await sendAppealRejectedEmail({
                        toEmail: rejectInfo.email,
                        toName: rejectInfo.username || undefined,
                        username: rejectInfo.username || undefined,
                        reason
                    });
                }
            } catch (emailError) {
                console.log(emailError);
            }

            await disableOriginalMessageButtons(rejectInfo.sourceMessageId);

            await postRejectionEmbed({
                userId: rejectInfo.userId,
                username: rejectInfo.username,
                email: rejectInfo.email,
                reason
            });

            return {
                statusCode: 303,
                headers: {
                    "Location": `/success?msg=${encodeURIComponent("Appeal rejected and logged successfully")}`
                }
            };
        } catch (e) {
            console.log(e);

            return {
                statusCode: 303,
                headers: {
                    "Location": `/error?msg=${encodeURIComponent("Invalid or expired token")}`
                }
            };
        }
    }

    return {
        statusCode: 405
    };
}