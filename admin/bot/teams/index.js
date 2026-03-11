'use strict';
/**
 * MS Teams Incoming Webhook integration for Milonexa Admin
 *
 * Sends Adaptive Cards for alerts and approval requests via Incoming Webhook URL.
 * Requires: TEAMS_WEBHOOK_URL env var
 *
 * Usage (CLI):
 *   TEAMS_WEBHOOK_URL=<url> node admin/bot/teams/index.js test
 *   TEAMS_WEBHOOK_URL=<url> node admin/bot/teams/index.js alert --title "CPU High" --text "CPU > 90%" --severity critical
 */

const https = require('https');
const { URL } = require('url');

class TeamsClient {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl || process.env.TEAMS_WEBHOOK_URL;
        if (!this.webhookUrl) {
            throw new Error('TEAMS_WEBHOOK_URL is required');
        }
    }

    // Post raw JSON payload to the webhook
    _post(payload) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify(payload);
            const parsed = new URL(this.webhookUrl);

            const options = {
                hostname: parsed.hostname,
                port: parsed.port || 443,
                path: parsed.pathname + parsed.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                },
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ status: res.statusCode, body: data });
                    } else {
                        reject(new Error(`Teams webhook returned HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    /**
     * Send an alert Adaptive Card.
     *
     * @param {{ title: string, text: string, severity: string, facts: Array<{name,value}> }}
     */
    async sendAlert({ title, text, severity = 'info', facts = [] }) {
        const severityColor = {
            critical: 'attention',
            high: 'warning',
            medium: 'warning',
            low: 'good',
            info: 'accent',
        }[severity] || 'accent';

        const payload = {
            type: 'message',
            attachments: [
                {
                    contentType: 'application/vnd.microsoft.card.adaptive',
                    content: {
                        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                        type: 'AdaptiveCard',
                        version: '1.4',
                        body: [
                            {
                                type: 'TextBlock',
                                size: 'Medium',
                                weight: 'Bolder',
                                text: title || 'Admin Alert',
                                color: severityColor,
                            },
                            {
                                type: 'TextBlock',
                                text: text || '',
                                wrap: true,
                            },
                            ...(facts.length > 0
                                ? [
                                    {
                                        type: 'FactSet',
                                        facts: facts.map((f) => ({ title: f.name, value: String(f.value) })),
                                    },
                                ]
                                : []),
                            {
                                type: 'TextBlock',
                                text: `Severity: **${severity.toUpperCase()}** — ${new Date().toISOString()}`,
                                size: 'Small',
                                isSubtle: true,
                            },
                        ],
                    },
                },
            ],
        };

        return this._post(payload);
    }

    /**
     * Send an approval request Adaptive Card with a review link.
     *
     * @param {{ title: string, description: string, requestId: string }}
     */
    async sendApprovalRequest({ title, description, requestId }) {
        const payload = {
            type: 'message',
            attachments: [
                {
                    contentType: 'application/vnd.microsoft.card.adaptive',
                    content: {
                        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                        type: 'AdaptiveCard',
                        version: '1.4',
                        body: [
                            {
                                type: 'TextBlock',
                                size: 'Medium',
                                weight: 'Bolder',
                                text: title || 'Approval Required',
                            },
                            {
                                type: 'TextBlock',
                                text: description || '',
                                wrap: true,
                            },
                            {
                                type: 'FactSet',
                                facts: [{ title: 'Request ID', value: requestId || 'N/A' }],
                            },
                            {
                                type: 'TextBlock',
                                text: `Requested at: ${new Date().toISOString()}`,
                                size: 'Small',
                                isSubtle: true,
                            },
                        ],
                        // Action opens admin panel for review (true interactivity requires Bot Framework)
                        actions: [
                            {
                                type: 'Action.OpenUrl',
                                title: '✅ Review & Approve',
                                url: `${process.env.ADMIN_PANEL_URL || 'http://localhost:3001'}/approvals/${requestId}`,
                            },
                        ],
                    },
                },
            ],
        };

        return this._post(payload);
    }

    /**
     * Send a test message to verify webhook connectivity.
     */
    async test() {
        return this.sendAlert({
            title: '✅ Milonexa Admin — Teams Integration Test',
            text: 'If you see this message, the MS Teams webhook is configured correctly.',
            severity: 'info',
            facts: [{ name: 'Timestamp', value: new Date().toISOString() }],
        });
    }
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

if (require.main === module) {
    const [, , command, ...rest] = process.argv;

    const parseArgs = (args) => {
        const out = {};
        for (let i = 0; i < args.length; i += 2) {
            out[args[i].replace(/^--/, '')] = args[i + 1];
        }
        return out;
    };

    (async () => {
        let client;
        try {
            client = new TeamsClient();
        } catch (err) {
            console.error('❌', err.message);
            process.exit(1);
        }

        try {
            if (command === 'test') {
                await client.test();
                console.log('✅ Test message sent to MS Teams');
            } else if (command === 'alert') {
                const opts = parseArgs(rest);
                await client.sendAlert({
                    title: opts.title,
                    text: opts.text,
                    severity: opts.severity || 'info',
                    facts: opts.facts ? JSON.parse(opts.facts) : [],
                });
                console.log('✅ Alert sent to MS Teams');
            } else if (command === 'approval') {
                const opts = parseArgs(rest);
                await client.sendApprovalRequest({
                    title: opts.title,
                    description: opts.description,
                    requestId: opts.requestId,
                });
                console.log('✅ Approval request sent to MS Teams');
            } else {
                console.error('Usage: node index.js <test|alert|approval> [--key value ...]');
                process.exit(1);
            }
        } catch (err) {
            console.error('❌ Teams error:', err.message);
            process.exit(1);
        }
    })();
}

module.exports = { TeamsClient };
