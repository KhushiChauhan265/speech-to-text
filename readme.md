# Speech To Text Application

## Project Overview

Speech To Text Application is a full-stack web application that allows users to upload or record audio and convert speech into text. The application uses AssemblyAI for speech recognition, Supabase Authentication for user login/signup, MongoDB for storing transcription history, and a React frontend for a responsive user interface.

---

## Features

* User Authentication using Supabase
* Email Verification for Signup
* Audio File Upload
* Voice Recording using Microphone
* Speech-to-Text Conversion using AssemblyAI API
* Transcription History Storage
* MongoDB Database Integration
* Responsive Frontend UI
* Deployed Frontend and Backend

---

## Tech Stack

### Frontend

* React.js (Vite)
* Tailwind CSS
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB Atlas
* Mongoose

### Authentication

* Supabase Auth

### Speech Recognition

* AssemblyAI API

### Deployment

* Vercel (Frontend)
* Render (Backend)

---

## Project Structure

```text
speech-to-text/
│
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── models/
│   ├── uploads/
│   ├── index.js
│   └── package.json
│
├── README.md
```

## Environment Variables

### Client (.env)

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=your_backend_url
```

### Server (.env)

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd speech-to-text
```

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

### Backend Setup

```bash
cd server
npm install
npm start
```

## API Workflow

1. User uploads or records audio.
2. Audio file is sent to backend.
3. Backend uploads audio to AssemblyAI.
4. AssemblyAI processes speech.
5. Transcript is returned to backend.
6. Transcript is stored in MongoDB.
7. Result is displayed on frontend.

---

## Authentication Flow

1. User signs up using email.
2. Verification email is sent.
3. User verifies email.
4. User logs in using Supabase Authentication.
5. Session is maintained securely.

---

## Deployment

### Frontend

Deployed using Vercel.

### Backend

Deployed using Render.

### Database

MongoDB Atlas Cloud Database.

---

## Future Improvements

* Better mobile responsiveness
* Download transcription as TXT/PDF
* Multi-language transcription support
* Real-time speech recognition
* Audio playback support

---

## Author

Khushi Chauhan

Speech To Text Internship Project at Labmentix 
