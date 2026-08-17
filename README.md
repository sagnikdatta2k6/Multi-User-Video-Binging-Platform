# Multi-User Video Binging Platform

A real-time, fully synchronized YouTube video and music streaming platform where multiple users can join a session, listen together, and chat in real-time. Built with a sleek Soft Neobrutalism UI.

## Features
- **Real-Time Synchronization**: Play, pause, and seek actions are synced across all users in a room using Socket.io.
- **Live Chat**: Instantly chat with other users in the same room.
- **Authentication**: Secure sign up and login system using JWT and bcrypt.
- **Custom Profiles**: Upload custom profile avatars and set display names.
- **Soft Neobrutalism Design**: A modern, playful, high-contrast aesthetic with soft shadows and rounded corners.

## Tech Stack
- **Frontend**: React, Vite, Framer Motion, React-Router, Axios
- **Backend**: Node.js, Express, Socket.io, Sequelize, SQLite (Dev) / PostgreSQL (Prod), Multer, Nodemailer

## Local Setup

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Start the application (requires two terminals):
   - Terminal 1 (Backend): `cd backend && npm start`
   - Terminal 2 (Frontend): `cd frontend && npm run dev`

## Deployment

This application is ready to be deployed on [Render](https://render.com/). It includes a `render.yaml` Blueprint file that configures a Web Service and a PostgreSQL database.

1. Connect this repository to your Render account.
2. Go to the Render Dashboard, click **New +** -> **Blueprint**.
3. Select this repository.
4. Render will automatically provision the database and build the full-stack application!
