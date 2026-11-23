# Urban Route Fleet

Web application for electric vehicle route planning, turn-by-turn navigation, and charging station slot booking.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [API Endpoints](#api-endpoints)
- [Testing the Flow](#testing-the-flow)
- [Configuration](#configuration)
- [Contact](#contact)

## Overview

Urban Route Fleet helps EV riders plan trips based on their current battery percentage and remaining range. Users can set up their vehicle details, calculate routes that automatically add a charging stop when arrival battery drops to 5% or below, follow turn-by-turn directions, and reserve 30-minute charging slots with UPI payment verification.

### Page Flow

```text
about.html
  -> login.html / signup.html / forgot.html
    -> ev_data.html
      -> route_planner.html
        -> navigation.html <-> /admin (server.js)
```

## Features

- **Landing Page (`about.html`)**: Entry page with navigation links, preloader, animated EV charging SVG, and contact link.
- **Authentication (`login.html`, `signup.html`, `forgot.html`)**:
  - Client-side form validation, password visibility toggles, and password strength indicator.
  - Local `localStorage` user storage with optional MockAPI support.
  - Four-step password reset flow using EmailJS to send 6-digit OTP codes.
- **Vehicle & GPS Setup (`ev_data.html`)**:
  - Uses the browser Geolocation API to capture current coordinates and accuracy.
  - Collects vehicle name, current battery percentage, and remaining range in kilometers.
- **Route Planner (`route_planner.html`)**:
  - Interactive Leaflet map with Google Streets and Google Satellite Hybrid tile layers.
  - Multi-stop routing with Nominatim and Komoot Photon place autocomplete, plus click-to-select map pinning.
  - Checks OSRM routes against the vehicle's remaining range. If direct arrival leaves 5% battery or less, it searches for a nearby charging station via Overpass API and inserts it as a stop.
- **Navigation & Slot Booking (`navigation.html`)**:
  - Full-screen navigation view with OSRM turn-by-turn instructions, live GPS tracking, and a simulated drive mode.
  - Detects off-route movement (>65 meters) and traffic segments along the route with options to reroute or continue.
  - Queries nearby charging stations from OpenStreetMap (Overpass API and Nominatim) and checks 30-minute slot availability per station.
  - Generates a 5-minute UPI QR code (`urbanroutefleet@ibl`) for a Rs. 50 booking fee, polls the Express server for confirmation, and displays a booking ticket with a 4-digit unlock PIN.
- **UPI Admin Panel (`/admin` via `server.js`)**:
  - Lists pending UPI payment requests in real time and lets an admin approve or reject each transaction.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | HTML5, CSS3, Vanilla JavaScript, Canvas API, Web Audio API |
| Backend | Node.js, Express 5, CORS |
| Maps & Routing | Leaflet.js, OSRM, OpenStreetMap (Overpass API, Nominatim), Komoot Photon |
| Payments & Email | QRCode.js, Razorpay Checkout SDK (optional), EmailJS |

## Project Structure

```text
urban-route-fleet/
├── about.html
├── about.css
├── about.js
├── login.html
├── login.css
├── login.js
├── signup.html
├── signup.css
├── signup.js
├── forgot.html
├── forgot.css
├── forgot.js
├── ev_data.html
├── ev_data.css
├── ev_data.js
├── route_planner.html
├── route_planner.css
├── route_planner.js
├── navigation.html
├── navigation.css
├── navigation.js
├── server.js
├── MEDIA.jpg
├── package.json
└── package-lock.json
```

## Local Setup

### Requirements

- Node.js 18 or higher
- A modern browser with location permissions enabled

### Run Locally

1. Clone the repository:

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
node server.js
```

4. Open the application in your browser:
   - Landing page: `http://localhost:3000/about.html`
   - Navigation page: `http://localhost:3000/navigation.html`
   - Admin payment panel: `http://localhost:3000/admin`

If you serve the HTML files through VS Code Live Server (`127.0.0.1:5500`), keep `node server.js` running in the terminal so `navigation.js` can reach the payment API at `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/payment-init` | Creates a pending Rs. 50 UPI payment session |
| `GET` | `/api/payment-status/:txnRef` | Returns current payment status (`PENDING`, `SUCCESS`, or `FAILED`) |
| `GET` | `/api/admin/payments` | Lists all payment sessions (newest first) |
| `POST` | `/api/admin/payments/:txnRef/approve` | Marks a pending transaction as `SUCCESS` |
| `POST` | `/api/admin/payments/:txnRef/fail` | Marks a pending transaction as `FAILED` |
| `GET` | `/admin` | Serves the admin payment verification page |

## Testing the Flow

1. Open `about.html` and go to **Login**. Create a new account or sign in with the default local test account:
   - Email: `test@example.com`
   - Password: `Password123`
2. On `ev_data.html`, click **Detect** to capture your GPS location, enter a vehicle name, battery percentage, and remaining range, then click **Save and continue**.
3. On `route_planner.html`, enter a destination, click **Update route**, and select any route card to open `navigation.html`.
4. Open `http://localhost:3000/admin` in a second tab.
5. On `navigation.html`, select a charging station and time slot, then click **Pay Rs. 50 & Book Slot**.
6. Approve or fail the pending request from `/admin` to see the status update and ticket confirmation on `navigation.html`.

## Configuration

- **EmailJS (`forgot.js`)**: Update `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID`, and `EMAILJS_TEMPLATE_ID` with your EmailJS account credentials.
- **UPI & Razorpay (`navigation.js`)**: Change `URF_UPI_ID` to set the receiving UPI address, or add a `RAZORPAY_KEY_ID` to use Razorpay Checkout.
- **User Backend (`login.js`, `signup.js`)**: Set `MOCK_USERS_URL` if you want to connect a remote MockAPI endpoint instead of `localStorage`.

## Contact

- Support: helpline.urbanroutefleet@gmail.com
- License: Copyright 2026 Urban Route Fleet