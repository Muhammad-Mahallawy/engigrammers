# FLOWTRACE chatbot-tab implementation plan

## What will be added

Add a **Chatbot** tab at `/chat`, alongside Explorer, Compare, Insights and Evidence. The page will be titled **FLOWTRACE Research Assistant**, with the subtitle “Ask about the experiments. Follow the evidence.” It will use the existing dark orbital design, blue accents and readable dark controls—not a third-party widget with mismatched styling.

Your existing experiment backend, filters, charts, comparison logic, source annotations and improved search picker will remain unchanged. Your n8n workflow will generate the answers; there will be no hidden replacement chatbot or fabricated fallback responses.

## Chat experience

The initial view will offer a few useful questions: “What is low-flow quenching?”, “Explain the difference between initial and final airflow”, and “Why are some final outcomes unspecified?” Suggested questions populate the composer; they do not send a request automatically.

The page will have distinct user/assistant messages, safe Markdown rendering, a multiline composer, Send, a visible waiting state, Stop waiting, Copy answer and New chat. Enter sends; Shift+Enter adds a line. Empty messages and repeat sends while a response is pending are blocked. Keyboard and screen-reader behavior will remain usable on desktop and mobile. New assistant messages will not force-scroll users who are reading earlier answers.

Errors will appear beside the affected message with a manual Retry action. Failed responses, empty output and workflow acknowledgments such as “Workflow got started” will never be presented as an assistant answer. There will be no automatic POST retries that could create duplicate executions.

## Connection architecture

Use the existing Express server as a same-origin adapter:

```text
Chatbot tab → POST /api/chat → your n8n webhook → normalized reply → Chatbot tab
```

The browser will not call n8n directly. This avoids depending on browser-to-n8n CORS and keeps the webhook address and any future authentication headers out of frontend code. The server will read `FLOWTRACE_CHAT_WEBHOOK_URL`, configured with the exact endpoint you provided:

```text
[your server-only FLOWTRACE_CHAT_WEBHOOK_URL]
```

The destination will be server-configured, not supplied by each browser request. The adapter will accept only the intended JSON chat shape, bound message/history sizes, use a finite upstream timeout, limit concurrent requests and apply basic server-side abuse controls. It will not log conversation bodies or expose n8n error pages or private credentials to users. An anonymous session ID is a conversation key, not authentication; hiding the webhook alone does not secure a publicly accessible chat.

The first release will use ordinary request/response messaging. Streaming will be added only if the supplied workflow actually returns a compatible stream.

## Webhook contract: proposed, not yet verified

The internal frontend request will contain a message, an anonymous conversation ID, a bounded recent conversation history and any explicitly enabled experiment context. The proposed n8n request is:

```json
{
  "action": "sendMessage",
  "sessionId": "anonymous-conversation-uuid",
  "chatInput": "The user's question",
  "history": [],
  "context": {
    "application": "FLOWTRACE",
    "experiments": []
  }
}
```

This is an integration proposal, **not a claim about your existing workflow's input schema**. A standard Webhook node can use arbitrary field names. After plan approval, one clearly identified synthetic question will establish its actual request/response contract. The adapter will be adjusted to that contract rather than repeatedly guessing fields or firing duplicate test messages. If the workflow expects another shape, I will need a sample request/response or its workflow export.

The browser-facing response will have a stable shape such as `{ "reply": "Answer text" }`. n8n documents `output` and `text` as standard agent/chat response fields; the adapter will normalize the actual verified response and reject unsupported bodies. The workflow must return the completed answer, not merely acknowledge that an execution started. For a Webhook node, that generally means **When Last Node Finishes** or **Respond to Webhook**. [1] [2]

### Current connection finding

On 14 November 2026, an **OPTIONS preflight request** to your supplied endpoint returned **HTTP 500, Internal Server Error**. No chat POST or user question was submitted during planning. This does **not** establish whether a real POST request succeeds, nor does it confirm the workflow's method, authentication, input fields or response shape. A server-side adapter avoids browser preflight requirements but cannot repair a failing n8n workflow. Live chat will be described as working only after a successful real integration test.

## Experiment grounding and scientific honesty

Offer an optional **Include selected experiments** control with visible record chips, limited to the current comparison selection of up to four records. It will be off by default; the user can see what public experimental data will be sent. Only bounded record fields and their source references will be attached. Missing measurements remain null, unknown outcomes remain unknown, and supplied CSV pressure ranges remain separately labelled annotations.

The chatbot will identify itself as AI interpretation, not a new measured outcome or a certified fire-safety adviser. It will be encouraged to distinguish observation from explanation, avoid inventing values or universal flame-survival thresholds, and cite supplied NASA sources when making record-specific claims. A source panel can link to real attached records independently of generated claims.

These scientific instructions must also be wired into the AI agent's system prompt in n8n. Passing context from the frontend alone cannot guarantee grounding. I will provide the recommended n8n prompt/configuration guidance; I will not claim to have changed your private workflow without access and authorization.

## Sessions and privacy

Use a random conversation UUID and browser `sessionStorage` so chat survives tab navigation and reloads within that browser session. Do not add an application database or cross-user transcript storage for this release. New chat clears the local transcript and rotates the session ID.

A visible notice will explain that questions and any enabled context are sent to your n8n workflow, and users should not enter private or sensitive information. n8n execution logs and any connected model or memory may retain data according to that workflow's settings. Clearing the local chat does not delete those remote logs or memories. Follow-up memory will be claimed only after the workflow's history/memory behavior is verified. [2]

## Project structure and delivery

`client/src/pages/Chatbot.tsx` will own the research-chat interface, with focused components for the transcript/composer and typed client helpers in `client/src/lib/chat.ts`. The new route will be registered in `App.tsx`, the shared desktop/mobile navigation in `Home.tsx`, and `client/public/manus-routes.json`. The current scientific-data error/loading gate will be adjusted so the chatbot is still reachable when the experiment API is offline; optional experiment context will then be unavailable, not invented.

`server/chatProxy.ts` will validate requests, call the configured n8n destination and normalize replies. `server/_core/index.ts` will register it before the SPA fallback, without changing the existing scientific proxy. `.env.example`, README and update instructions will document server-side webhook configuration and Windows startup. Existing React/Express and installed libraries will be reused; no extra model API key or n8n chat-widget dependency is planned.

Delivery will include the live Preview, a complete updated source ZIP and a cumulative update ZIP. Unlike the previous style-only patch, this feature needs **both client and server files**, server configuration, and a frontend-server restart. It will not replace your Python backend, installed `node_modules` or private `.env` file. Type/build checks and focused tests will cover request validation, response normalization, clear/session behavior and connection errors. The live n8n test will use synthetic content only.

The proposed scope excludes voice input, uploads, cross-device chat accounts, automatic scientific predictions and independent web browsing by the bot. Whether the existing n8n workflow has any such tools is not currently known.

## Approval requested

Approve this plan to build the tab and run a minimal synthetic-message integration test against the supplied webhook. If the n8n contract cannot be established, the interface and adapter can still be built with an honest connection-error state, but live chatbot delivery will remain blocked until the workflow is reachable and returns an answer.

## References

[1]: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/ "n8n Webhook node: methods, production URLs and response modes"
[2]: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/ "n8n Chat Trigger: custom interfaces, response fields and session memory"
