# CampusFind

CampusFind is a MERN stack web application that helps students reconnect with lost belongings on campus through private, verified matching.

Instead of dumping every lost-and-found post into one noisy public feed, CampusFind intelligently connects only relevant users, allows them to verify details privately, and helps them safely recover items through in-app communication.

---

## Overview

Losing something on campus is frustrating. Wallets, ID cards, earphones, chargers, keys, and notebooks disappear all the time, and most existing solutions are messy, public, and unreliable.

CampusFind simplifies the process by creating a private and secure lost-and-found system where users can report lost or found items, receive relevant matches, and connect directly with the right person.

The platform reduces noise, improves trust, and makes item recovery faster.

---

## Features

- Secure user authentication with Google OAuth
- Private lost and found request creation
- Smart item matching based on title, description, tags, and location
- Real-time private chat between matched users
- Email notifications when a relevant match is found
- Match verification with user confirmation
- Automatic match status updates
- Resolved matches view for successful recoveries
- Clean dashboard to manage personal requests and matches
- Real-time updates using sockets without page refresh

---

## How It Works

1. A user reports a lost or found item
2. CampusFind analyzes item details and searches for possible matches
3. Matching users are notified instantly
4. Both users can chat privately inside the platform
5. Once the item is verified and returned, both users confirm the match
6. The request is marked resolved and stored in successful matches

---

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express.js

### Database
- MongoDB Atlas

### Authentication
- Google OAuth
- JWT

### Real-Time Communication
- Socket.IO

### Notifications
- SendGrid

---

## Project Structure

```bash
CampusFind/
│
├── client/                 # Frontend
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/                 # Backend
│   ├── src/
│   ├── package.json
│   └── .env
│
└── README.md