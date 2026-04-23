import fetch from "node-fetch";

export async function sendUnbanEmail({ toEmail, toName, username }) {
    if (!process.env.EMAIL_API_TOKEN) {
        throw new Error("Missing EMAIL_API_TOKEN");
    }

    if (!toEmail) {
        throw new Error("Missing destination email");
    }

    const safeName = toName || username || "player";
    const inviteUrl = "https://avaloncs.net/ds";

    const htmlPart = `
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

    const textPart = [
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

    const response = await fetch("https://avaloncs.ipzmarketing.com/api/v1/send_emails", {
        method: "POST",
        headers: {
            "X-AUTH-TOKEN": process.env.EMAIL_API_TOKEN,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: {
                email: "avaloncs@avaloncs.net",
                name: "Avalon Community Servers"
            },
            to: [
                {
                    email: toEmail,
                    name: safeName
                }
            ],
            subject: "Your AvalonCS appeal has been accepted",
            html_part: htmlPart,
            text_part: textPart,
            text_part_auto: true,
            headers: {
                "X-Source": "avaloncs-ban-appeals"
            },
            smtp_tags: ["appeal-accepted", "unban-notification"]
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.log(data);
        throw new Error("Failed to send unban email");
    }

    return data;
}

export async function sendAppealRejectedEmail({ toEmail, toName, username, reason }) {
    if (!process.env.EMAIL_API_TOKEN) {
        throw new Error("Missing EMAIL_API_TOKEN");
    }

    if (!toEmail) {
        throw new Error("Missing destination email");
    }

    const safeName = toName || username || "player";

    const htmlPart = `
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
                Hello ${safeName},
            </p>

            <p style="margin:0 0 16px;line-height:1.75;color:#c7d2ea;">
                The Avalon Community Servers staff team has carefully reviewed your appeal and has decided not to approve it at this time.
            </p>

            <p style="margin:0 0 10px;line-height:1.75;color:#c7d2ea;">
                Reason provided by staff:
            </p>

            <div style="margin:0 0 18px;padding:14px 16px;background:#0b0f18;border-radius:12px;border:1px solid #2a3347;color:#eef3ff;line-height:1.7;">
                ${escapeHtml(reason)}
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

    const textPart = [
        "Your AvalonCS appeal has been rejected.",
        "",
        `Hello ${safeName},`,
        "",
        "The Avalon Community Servers staff team has carefully reviewed your appeal and has decided not to approve it at this time.",
        "",
        "Reason provided by staff:",
        reason,
        "",
        "Regards,",
        "Avalon Community Servers"
    ].join("\n");

    const response = await fetch("https://avaloncs.ipzmarketing.com/api/v1/send_emails", {
        method: "POST",
        headers: {
            "X-AUTH-TOKEN": process.env.EMAIL_API_TOKEN,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: {
                email: "avaloncs@avaloncs.net",
                name: "Avalon Community Servers"
            },
            to: [
                {
                    email: toEmail,
                    name: safeName
                }
            ],
            subject: "Your AvalonCS appeal has been rejected",
            html_part: htmlPart,
            text_part: textPart,
            text_part_auto: true,
            headers: {
                "X-Source": "avaloncs-ban-appeals"
            },
            smtp_tags: ["appeal-rejected", "appeal-notification"]
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.log(data);
        throw new Error("Failed to send rejection email");
    }

    return data;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}