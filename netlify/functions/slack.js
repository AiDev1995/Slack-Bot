const { WebClient } = require('@slack/web-api');
const crypto = require('crypto');

// Initialize Slack WebClient with your bot token
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

// Function to verify Slack request signature
function verifySlackRequest(signature, timestamp, body) {
    const hmac = `v0=${crypto
        .createHmac('sha256', process.env.SLACK_SIGNING_SECRET)
        .update(`v0:${timestamp}:${body}`)
        .digest('hex')}`;
    return crypto.timingSafeEqual(Buffer.from(hmac, 'utf-8'), Buffer.from(signature, 'utf-8'));
}

exports.handler = async (event) => {
    const signature = event.headers['x-slack-signature'];
    const timestamp = event.headers['x-slack-request-timestamp'];
    const body = event.body;

    // Verify Slack request
    if (!verifySlackRequest(signature, timestamp, body)) {
        return { statusCode: 400, body: 'Invalid request' };
    }

    const payload = JSON.parse(body);

    if (payload.event && payload.event.type === 'message') {
        const { text, user } = payload.event;
        const mentions = text.match(/<@([A-Z0-9]+)>/g);

        if (mentions) {
            for (const mention of mentions) {
                const mentionedUser = mention.replace(/<@|>/g, '');
                await slackClient.chat.postMessage({
                    channel: mentionedUser,
                    text: `You were mentioned in a channel by <@${user}>: "${text}"`,
                });
            }
        }
    }

    return { statusCode: 200, body: 'Event processed' };
};
