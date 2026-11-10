# Portfolio AI chat

Run `node chat-server.mjs` with Node.js 20+ and a valid `GEMINI_API_KEY` set in the server environment. The default provider is Gemini 3.1 Flash-Lite. Use a Google AI Studio project on the free tier if you want to keep inference within its free quota. Google may use free-tier requests to improve its products, so avoid sending private material. To use OpenAI instead, set `CHAT_PROVIDER=openai` and `OPENAI_API_KEY`.

The local app serves the portfolio at `http://127.0.0.1:8767/`. The existing static preview on port 8766 can call the same local backend.

## Render Free and GitHub Pages

1. Push the portfolio source to GitHub. Keep `.env.local` on your computer.
2. In Render, create a Blueprint from the repository and select the Free plan defined in `render.yaml`. Enter the Gemini key in Render’s `GEMINI_API_KEY` secret prompt.
3. Check that the assigned Render URL returns HTTP 200 at `/healthz`. Send a Roman Urdu and an English question to `/api/chat` to verify Gemini independently of the frontend.
4. Set the `portfolio-chat-endpoint` meta tag in `index.html` to the verified Render HTTPS URL ending in `/api/chat`, then push that frontend update to the GitHub Pages branch.

Render’s free service can sleep when idle. The first chat request after idle may take about a minute.

GitHub Pages serves the static site. Deploy `chat-server.mjs` together with `index.html` to a Node.js host and set `GEMINI_API_KEY` in that host’s secret settings. Set `HOST=0.0.0.0` if the host requires it. Set the `portfolio-chat-endpoint` meta tag in `index.html` to the backend’s HTTPS `/api/chat` URL before publishing the frontend. The GitHub Pages origin `https://zuhairqr.github.io` is already allowed. For a custom frontend domain, set `CHAT_ALLOWED_ORIGINS` to its origin.

The server reads public portfolio sections at startup to ground the model’s answers. Restart the backend after changing those sections. Requests have size, rate, concurrency, and daily limits. The limits are per running server and reset when it restarts. Keep provider-side spending controls for public hosting.
