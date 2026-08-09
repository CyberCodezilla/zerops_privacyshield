import http from 'http';
import https from 'https';
import { URL } from 'url';

export interface UpstreamRequestOptions {
  apiKey?: string;
  body: any;
  stream?: boolean;
}

export async function forwardToUpstream(
  options: UpstreamRequestOptions,
  onStreamChunk?: (chunk: string) => void
): Promise<{ statusCode: number; data: any }> {
  const targetUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;

  // If no OpenAI API key is provided, use the built-in PrivacyShield AI engine mock response generator
  if (!apiKey || apiKey === 'Bearer sk-mock' || apiKey === 'sk-mock') {
    return handleMockUpstream(options, onStreamChunk);
  }

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const postData = JSON.stringify(options.body);

    const reqOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const httpModule = parsedUrl.protocol === 'https:' ? https : http;

    const req = httpModule.request(reqOptions, res => {
      let body = '';

      if (options.stream && onStreamChunk) {
        res.on('data', (chunk: Buffer) => {
          onStreamChunk(chunk.toString('utf-8'));
        });

        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 200, data: { status: 'stream_completed' } });
        });
      } else {
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf-8');
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ statusCode: res.statusCode || 200, data: parsed });
          } catch {
            resolve({ statusCode: res.statusCode || 500, data: { raw: body } });
          }
        });
      }
    });

    req.on('error', err => {
      console.warn('Upstream call error, falling back to mock engine response:', err.message);
      resolve(handleMockUpstream(options, onStreamChunk));
    });

    req.write(postData);
    req.end();
  });
}

function handleMockUpstream(
  options: UpstreamRequestOptions,
  onStreamChunk?: (chunk: string) => void
): { statusCode: number; data: any } {
  const model = options.body?.model || 'gpt-4o';
  const messages = options.body?.messages || [];
  const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop()?.content || '';

  // Generate an intelligent mock response referencing any redacted tokens present in the sanitized input
  let responseText = '';

  if (typeof lastUserMsg === 'string') {
    if (lastUserMsg.includes('[SSN_REDACTED') || lastUserMsg.includes('[CARD_REDACTED') || lastUserMsg.includes('[NAME_REDACTED')) {
      responseText = `I have received the record for patient [NAME_REDACTED_1] (SSN: [SSN_REDACTED_1]) with payment card [CARD_REDACTED_1]. The clinical summary has been documented securely with full zero-trust privacy compliance.`;
    } else if (lastUserMsg.includes('[SECRET_KEY_REDACTED')) {
      responseText = `Security Audit Alert: Identified credentials [SECRET_KEY_REDACTED_1]. Please ensure environment secrets are configured securely and never committed to source code repositories.`;
    } else if (lastUserMsg.includes('[EMAIL_REDACTED') || lastUserMsg.includes('[PHONE_REDACTED')) {
      responseText = `Support ticket processed for customer contact [EMAIL_REDACTED_1] ([PHONE_REDACTED_1]). The issue has been routed to tier-2 support.`;
    } else {
      responseText = `PrivacyShield Gateway confirmed: Received prompt (${lastUserMsg.substring(0, 60)}...). Request sanitized and processed under zero-trust enterprise compliance rules.`;
    }
  } else {
    responseText = `PrivacyShield Gateway confirmed: Request sanitized and processed successfully.`;
  }

  if (options.stream && onStreamChunk) {
    const words = responseText.split(' ');
    const id = `chatcmpl-mock-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    setTimeout(() => {
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i === words.length - 1 ? '' : ' ');
        const chunkObj = {
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [
            {
              index: 0,
              delta: { content: word },
              finish_reason: i === words.length - 1 ? 'stop' : null
            }
          ]
        };
        onStreamChunk(`data: ${JSON.stringify(chunkObj)}\n\n`);
      }
      onStreamChunk('data: [DONE]\n\n');
    }, 50);

    return { statusCode: 200, data: { status: 'stream_started' } };
  }

  const completionResponse = {
    id: `chatcmpl-${Math.random().toString(36).substring(2, 9)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: responseText
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 45,
      completion_tokens: 32,
      total_tokens: 77
    }
  };

  return { statusCode: 200, data: completionResponse };
}
