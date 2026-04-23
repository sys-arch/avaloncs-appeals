import fetch from 'node-fetch';

import { API_ENDPOINT, MAX_EMBED_FIELD_CHARS, MAX_EMBED_FOOTER_CHARS } from "./helpers/discord-helpers.js";
import { createJwt, decodeJwt } from "./helpers/jwt-helpers.js";
import { getBan, isBlocked } from "./helpers/user-helpers.js";

function getAdminRoleIds() {
    return (process.env.ADMIN_ROLES_ID || "")
        .split(",")
        .map(v => v.trim())
        .filter(Boolean);
}

function buildAdminMentions(roleIds) {
    if (!roleIds.length) return "";
    return roleIds.map(id => `<@&${id}>`).join(" ");
}

export async function handler(event, context) {
    let payload;

    if (process.env.USE_NETLIFY_FORMS) {
        payload = JSON.parse(event.body).payload.data;
    } else {
        if (event.httpMethod !== "POST") {
            return {
                statusCode: 405
            };
        }

        const params = new URLSearchParams(event.body);
        payload = {
            banReason: params.get("banReason") || undefined,
            appealText: params.get("appealText") || undefined,
            futureActions: params.get("futureActions") || undefined,
            token: params.get("token") || undefined
        };
    }

    if (
        payload.banReason !== undefined &&
        payload.appealText !== undefined &&
        payload.futureActions !== undefined &&
        payload.token !== undefined
    ) {
        const userInfo = decodeJwt(payload.token);

        if (isBlocked(userInfo.id)) {
            return {
                statusCode: 303,
                headers: {
                    "Location": `/error?msg=${encodeURIComponent("You cannot submit ban appeals with this Discord account.")}`,
                },
            };
        }

        const adminRoleIds = getAdminRoleIds();
        const adminMentions = buildAdminMentions(adminRoleIds);

        const message = {
            content: adminMentions || undefined,
            allowed_mentions: {
                parse: [],
                roles: adminRoleIds
            },
            embed: {
                title: "New appeal submitted!",
                timestamp: new Date().toISOString(),
                fields: [
                    {
                        name: "Submitter",
                        value: `<@${userInfo.id}> (${userInfo.username})`
                    },
                    {
                        name: "Email",
                        value: userInfo.email || "Not available"
                    },
                    {
                        name: "Why were you banned?",
                        value: payload.banReason.slice(0, MAX_EMBED_FIELD_CHARS)
                    },
                    {
                        name: "Why do you feel you should be unbanned?",
                        value: payload.appealText.slice(0, MAX_EMBED_FIELD_CHARS)
                    },
                    {
                        name: "What will you do to avoid being banned in the future?",
                        value: payload.futureActions.slice(0, MAX_EMBED_FIELD_CHARS)
                    }
                ]
            }
        };

        if (process.env.GUILD_ID && !process.env.DISCORD_WEBHOOK_URL) {
            try {
                const ban = await getBan(userInfo.id, process.env.GUILD_ID, process.env.DISCORD_BOT_TOKEN);

                if (ban !== null && ban.reason) {
                    message.embed.footer = {
                        text: `Original ban reason: ${ban.reason}`.slice(0, MAX_EMBED_FOOTER_CHARS)
                    };
                }
            } catch (e) {
                console.log(e);
            }
        }

        let result;
        let createdMessage;

        if (!process.env.DISCORD_WEBHOOK_URL) {
            result = await fetch(
                `${API_ENDPOINT}/channels/${encodeURIComponent(process.env.APPEALS_CHANNEL)}/messages`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`
                    },
                    body: JSON.stringify({
                        content: message.content,
                        allowed_mentions: message.allowed_mentions,
                        embeds: [message.embed]
                    })
                }
            );

            if (!result.ok) {
                console.log(JSON.stringify(await result.json()));
                throw new Error("Failed to submit message");
            }

            createdMessage = await result.json();

            if (!process.env.DISABLE_UNBAN_LINK) {
                const approveUrl = new URL("/.netlify/functions/unban", DEPLOY_PRIME_URL);
                const rejectUrl = new URL("/.netlify/functions/reject-appeal", DEPLOY_PRIME_URL);

                const actionInfo = {
                    userId: userInfo.id,
                    email: userInfo.email || null,
                    username: userInfo.username || null,
                    sourceMessageId: createdMessage.id
                };

                await fetch(
                    `${API_ENDPOINT}/channels/${encodeURIComponent(process.env.APPEALS_CHANNEL)}/messages/${encodeURIComponent(createdMessage.id)}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`
                        },
                        body: JSON.stringify({
                            components: [{
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: 5,
                                        label: "Approve appeal",
                                        url: `${approveUrl.toString()}?token=${encodeURIComponent(createJwt(actionInfo, "7d"))}`
                                    },
                                    {
                                        type: 2,
                                        style: 5,
                                        label: "Reject appeal",
                                        url: `${rejectUrl.toString()}?token=${encodeURIComponent(createJwt(actionInfo, "7d"))}`
                                    }
                                ]
                            }]
                        })
                    }
                );
            }
        } else {
            result = await fetch(`${process.env.DISCORD_WEBHOOK_URL}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: message.content,
                    allowed_mentions: message.allowed_mentions,
                    embeds: [message.embed]
                })
            });

            if (!result.ok) {
                console.log(JSON.stringify(await result.json()));
                throw new Error("Failed to submit message");
            }
        }

        if (process.env.USE_NETLIFY_FORMS) {
            return {
                statusCode: 200
            };
        } else {
            return {
                statusCode: 303,
                headers: {
                    "Location": "/success"
                }
            };
        }
    }

    return {
        statusCode: 400
    };
}