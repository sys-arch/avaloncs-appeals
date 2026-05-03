import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_SOURCE = "avaloncs-ban-appeals";
const DEFAULT_FROM_NAME = "Avalon Community Servers";

function getFromAddress() {
    const fromEmail = process.env.EMAIL_FROM_ADDRESS;
    const fromName = process.env.EMAIL_FROM_NAME || DEFAULT_FROM_NAME;

    if (!process.env.RESEND_API_KEY) {
        throw new Error("Missing RESEND_API_KEY");
    }

    if (!fromEmail) {
        throw new Error("Missing EMAIL_FROM_ADDRESS");
    }

    return `${fromName} <${fromEmail}>`;
}

async function sendAppealEmail({ toEmail, toName, subject, html, text, type }) {
    if (!toEmail) {
        throw new Error("Missing destination email");
    }

    const { data, error } = await resend.emails.send({
        from: getFromAddress(),
        to: [`${toName || "player"} <${toEmail}>`],
        subject,
        html,
        text,
        headers: {
            "X-Source": EMAIL_SOURCE,
            "X-Email-Type": type
        },
        tags: [
            {
                name: "source",
                value: EMAIL_SOURCE
            },
            {
                name: "type",
                value: type
            }
        ]
    });

    if (error) {
        console.error(error);
        throw new Error(`Failed to send ${type} email`);
    }

    return data;
}

export async function sendUnbanEmail({ toEmail, toName, username }) {
    const safeName = toName || username || "player";
    const inviteUrl = "https://avaloncs.net/ds";

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>AvalonCS Appeal Accepted</title>
</head>
<body style="margin:0;padding:0;background:#0b101b;color:#eef3ff;font-family:Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#121928;border:1px solid #2a3347;border-radius:16px;padding:32px;">
            <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#ffffff;">
                Your AvalonCS appeal has been accepted
            </h1>

            <p style="margin:0 0 16px;line-height:1.75;color:#c7d2ea;">
                Hello ${escapeHtml(safeName)},
            </p>

            <p style="margin:0 0 16px;line-height:1.75;color:#c7d2ea;">
                We are writing to inform you that the Avalon Community Servers staff team has carefully
                reviewed your appeal in full. After considering the information provided and assessing
                your case thoroughly, the staff has decided to approve your request.
            </p>

            <p style="margin:0 0 16px;line-height:1.75;color:#c7d2ea;">
                As a result, your Discord account has now been unbanned and you may rejoin the community.
                Please make sure that, before returning, you review the current rules and standards in force.
                Any future violations may lead to further action being taken.
            </p>

            <p style="margin:0 0 24px;line-height:1.75;color:#c7d2ea;">
                If you wish to return, you can use the link below to join the server again:
            </p>

            <div style="margin:0 0 24px;">
                <a href="${inviteUrl}" style="display:inline-block;padding:14px 20px;border-radius:10px;background:#f59e0b;color:#111111;text-decoration:none;font-weight:700;">
                    Rejoin AvalonCS
                </a>
            </div>

            <p style="margin:0 0 16px;line-height:1.75;color:#c7d2ea;">
                If the button above does not work, you can also use this link directly:
                <br>
                <a href="${inviteUrl}" style="color:#ffcc66;text-decoration:none;">${inviteUrl}</a>
            </p>

            <p style="margin:0;line-height:1.75;color:#c7d2ea;">
                Regards,<br>
                Avalon Community Servers
            </p>
        </div>
    </div>
</body>
</html>
`.trim();

    const text = [
        "Your AvalonCS appeal has been accepted.",
        "",
        `Hello ${safeName},`,
        "",
        "We are writing to inform you that the Avalon Community Servers staff team has carefully reviewed your appeal in full.",
        "After considering the information provided and assessing your case thoroughly, the staff has decided to approve your request.",
        "",
        "As a result, your Discord account has now been unbanned and you may rejoin the community.",
        "Please make sure that, before returning, you review the current rules and standards in force.",
        "Any future violations may lead to further action being taken.",
        "",
        "You can rejoin the server using this link:",
        inviteUrl,
        "",
        "Regards,",
        "Avalon Community Servers"
    ].join("\n");

    return sendAppealEmail({
        toEmail,
        toName: safeName,
        subject: "Your AvalonCS appeal has been accepted",
        html,
        text,
        type: "appeal-accepted"
    });
}

export async function sendAppealRejectedEmail({ toEmail, toName, username, reason }) {
    const safeName = toName || username || "player";
    const safeReason = reason || "No specific reason was provided.";

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>AvalonCS Appeal Rejected</title>
</head>
<body style="margin:0;padding:0;background:#0b101b;color:#eef3ff;font-family:Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#121928;border:1px solid #2a3347;border-radius:16px;padding:32px;">
            <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#ffffff;">
                Your AvalonCS appeal has been rejected
            </h1>

            <p style="margin:0 0 16px;line-height:1.75;color:#c7d2ea;">
                Hello ${escapeHtml(safeName)},
            </p>

            <p style="margin:0 0 16px;line-height:1.75;color:#c7d2ea;">
                The Avalon Community Servers staff team has carefully reviewed your appeal and has decided not to approve it at this time.
            </p>

            <p style="margin:0 0 10px;line-height:1.75;color:#c7d2ea;">
                Reason provided by staff:
            </p>

            <div style="margin:0 0 18px;padding:14px 16px;background:#0b0f18;border-radius:12px;border:1px solid #2a3347;color:#eef3ff;line-height:1.7;">
                ${escapeHtml(safeReason)}
            </div>

            <p style="margin:0;line-height:1.75;color:#c7d2ea;">
                Regards,<br>
                Avalon Community Servers
            </p>
        </div>
    </div>
</body>
</html>
`.trim();

    const text = [
        "Your AvalonCS appeal has been rejected.",
        "",
        `Hello ${safeName},`,
        "",
        "The Avalon Community Servers staff team has carefully reviewed your appeal and has decided not to approve it at this time.",
        "",
        "Reason provided by staff:",
        safeReason,
        "",
        "Regards,",
        "Avalon Community Servers"
    ].join("\n");

    return sendAppealEmail({
        toEmail,
        toName: safeName,
        subject: "Your AvalonCS appeal has been rejected",
        html,
        text,
        type: "appeal-rejected"
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}