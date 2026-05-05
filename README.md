# 🎒 CampusFind

> A MERN-stack web app to connect students who lose or find items within the university.  
> Unlike public boards, CampusFind privately matches only relevant users and lets them confirm matches through private chat.

---

## 🚀 Problem We Solve
Losing something on campus (ID card, earbuds, wallet…) is common, but:
- Most solutions show a noisy public feed.
- Users must manually search through endless posts.
- Privacy and real matching accuracy are poor.

---

## 💡 Our Twist (Differentiator)
- Requests are **private** by default — only owners and potential matches can view details.
- Each Lost/Found request runs through a **matching algorithm** (text similarity of title/description/tags/location).
- If similarity ≥ 60% → a **match** is created and both users are notified by email.
- Users can **chat inside the app** to verify match details.
- Final closure of a match is **manual** and requires confirmation from **both** sides; only then the match is marked successful.

---

## ✨ Features

### ST1 (initial milestone)
- Google OAuth2 login (restricted to `@chitkara.edu.in`).
- JWT-secured backend APIs.
- Create Lost or Found requests with: category, title, description, tags, location, images.
- Smart request-matching engine (text-based + simple heuristics).
- Email notifications via SendGrid (match notifications).
- Real-time chat using Socket.IO.
- Dashboard shows **only your requests** with potential matches.

### ST2 (new improvements)
- **Manual confirmation workflow**
  - Both parties must click a confirm button (lost: *item received*, found: *item returned*).
  - Only after both confirm does the match become **closed** and requests become **resolved**.
- **Keep matching until resolved**
  - A lost request can be matched to multiple found requests (and vice-versa) until a match is fully resolved by both parties.
- **Match cancellation & propagation**
  - When a match is closed, the server cancels other matches that involve either request (status -> `cancelled`), removes them from the requests’ matches lists, and emits socket events so clients update immediately.
- **Instant UI updates**
  - Dashboard and open chat windows listen for socket events (`match:updated`, `match:cancelled`, `match:closed`) and refresh automatically — no page refresh required.
- **Successful matches page**
  - A `Successful Matches` (Resolved) page shows closed matches in a greyed / “closed” style to build trust.
- **Chat improvements**
  - Chat modal auto-closes if the underlying match gets cancelled/closed; message history is available from the server for the match while it was open.

---

## ✅ Tech Stack
- **Frontend:** React (Vite) + TailwindCSS  
- **Backend:** Node.js + Express  
- **Database:** MongoDB Atlas  
- **Auth:** Google OAuth2 + JWT  
- **Real-time:** Socket.IO  
- **Email:** SendGrid

---

## Repo layout (important files)
```
/server
  /src
    /models
      Request.js
      Match.js
      User.js
      ChatMessage.js
    /routes
      auth.js
      requests.js        <-- create requests, trigger matcher
      matches.js         <-- match details, messages, confirm
    /services
      email.js           <-- SendGrid wrapper
      matcher.js         <-- computeScore (text based)
      socketEmitter.js   <-- server-side socket emitter helper
    /sockets
      socketHandler.js   <-- socket auth, join, message:send
    app.js
/client
  /src
    /pages
      Dashboard.jsx
      Chat.jsx
      Resolved.jsx
      CreateRequest.jsx
    /components
      NavBar.jsx
      MatchesModal.jsx
    /services
      api.js
      auth.js
      socket.js
```

---

## Environment variables (sample `.env`)
> **Do not commit `.env`** — add these to your environment or `.env` and keep it out of git.

```
PORT=5000
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<secure-random-secret>
FRONTEND_URL=http://localhost:3000
SENDGRID_API_KEY=<your-sendgrid-key>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-secret>
```

---

## .gitignore suggestion
```
node_modules/
client/node_modules/
.env
dist/
.DS_Store
.vscode/
*.log
```

---

## Install & Run (dev)
**Server**
```bash
cd server
npm install
# provide .env as above
npm run dev
```

**Client**
```bash
cd client
npm install
npm run dev
# client expects VITE_API_URL or uses http://localhost:5000
```

---

## Important API endpoints (short)
- `POST /auth/google` — OAuth login (server endpoint/flow)
- `POST /api/requests` — Create Lost/Found request (auth)
- `GET /api/requests/me` — Get my requests + matches (auth)
- `GET /api/requests/:id` — Get request details (auth + pair check)
- `GET /api/matches/:id` — Get match details (auth)
- `GET /api/matches/:id/messages` — Get chat history for this match (auth & participant)
- `POST /api/matches/:id/confirm` — Confirm match (auth; closes when both confirm)
- `GET /api/matches/resolved/all` — Get closed (successful) matches
- WebSockets: connect to `io` with `auth: { token }`, listen for:
  - `message:new` — new chat message
  - `match:updated` — match confirmations/updates
  - `match:cancelled` / `match:closed` — UI should remove/disable matches

---


