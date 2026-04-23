import fetch from "node-fetch";

import { decodeJwt } from "./helpers/jwt-helpers.js";
import { unbanUser } from "./helpers/user-helpers.js";
import { sendUnbanEmail } from "./helpers/email-helpers.js";
import { API_ENDPOINT } from "./helpers/discord-helpers.js";

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

async function postApprovalEmbed({ userId, username, email }) {
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
                    title: "Appeal approved",
                    color: 0x22c55e,
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
                            name: "Action",
                            value: "The user has been unbanned and the approval email has been sent or attempted."
                        }
                    ]
                }]
            })
        }
    );

    if (!response.ok) {
        console.log(await response.json());
        throw new Error("Failed to post approval embed");
    }
}

export async function handler(event, context) {
    if (event.httpMethod !== "GET") {
        return {
            statusCode: 405
        };
    }

    if (event.queryStringParameters?.token !== undefined) {
        try {
            const unbanInfo = decodeJwt(event.queryStringParameters.token);

            if (unbanInfo.userId !== undefined && unbanInfo.sourceMessageId !== undefined) {
                try {
                    const originalMessage = await getOriginalMessage(unbanInfo.sourceMessageId);

                    if (!isAppealStillOpen(originalMessage)) {
                        return {
                            statusCode: 303,
                            headers: {
                                "Location": `/error?msg=${encodeURIComponent("This appeal has already been processed")}`
                            }
                        };
                    }

                    await unbanUser(
                        unbanInfo.userId,
                        process.env.GUILD_ID,
                        process.env.DISCORD_BOT_TOKEN
                    );

                    let emailStatus = "No email address was available.";

                    try {
                        if (unbanInfo.email) {
                            await sendUnbanEmail({
                                toEmail: unbanInfo.email,
                                toName: unbanInfo.username || undefined,
                                username: unbanInfo.username || undefined
                            });
                            emailStatus = "Approval email sent successfully.";
                        }
                    } catch (emailError) {
                        console.log(emailError);
                        emailStatus = "The user was unbanned, but the approval email could not be sent.";
                    }

                    await disableOriginalMessageButtons(unbanInfo.sourceMessageId);
                    await postApprovalEmbed({
                        userId: unbanInfo.userId,
                        username: unbanInfo.username,
                        email: unbanInfo.email
                    });

                    return {
                        statusCode: 303,
                        headers: {
                            "Location": `/success?msg=${encodeURIComponent(`User has been unbanned. ${emailStatus}`)}`
                        }
                    };
                } catch (e) {
                    console.log(e);

                    return {
                        statusCode: 303,
                        headers: {
                            "Location": `/error?msg=${encodeURIComponent("Failed to unban user\nPlease manually unban")}`
                        }
                    };
                }
            }
        } catch (e) {
            return {
                statusCode: 303,
                headers: {
                    "Location": `/error?msg=${encodeURIComponent("Invalid or expired token")}`
                }
            };
        }
    }

    return {
        statusCode: 400
    };
}