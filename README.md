# MH Servers Dashboard

A sleek, lightweight static start page serving as a central access point for self-hosted homelab applications and web tools. 

## 🚀 Overview

This repository contains the frontend code for the MH Servers dashboard. It is designed to be a fast, responsive, and aesthetically pleasing landing page that routes to various self-hosted services running on a home server infrastructure.

### Features
* **Dynamic Background:** A high-density 3D particle ocean animation built with Three.js.
* **Live Weather & Time:** Integrates with WeatherAPI and local browser geolocation to display real-time weather conditions, temperature, and local time.
* **Glassmorphism UI:** Clean, dark-mode focused interface with glowing SVG accents, CSS grid layouts, and smooth hover animations.
* **Service Routing:** Direct portal to self-hosted applications including Jellyfin, Nextcloud, and custom web tools.

## 🛠️ Tech Stack & Architecture

**Frontend:**
* HTML5 / CSS3 (Vanilla)
* JavaScript (ES6)
* Three.js (3D Background Canvas)

**Infrastructure & Deployment:**
* **Frontend Hosting:** GitHub Pages 
* **CDN & DNS:** Cloudflare
* **Backend Hosting:** TrueNAS SCALE
* **Containerization:** Docker / Dockge (routing to Jellyfin, Nextcloud, etc.)
* **Networking:** UniFi Cloud Gateway Fiber (handling VLAN isolation, firewall rules, and reverse proxying)

## 📁 Repository Structure

```text
/
├── css/
│   └── style.css       # Core styling, responsive design, and CSS animations
├── js/
│   └── main.js         # Weather API logic, Three.js initialization, DOM events
├── .well-known/        # API and domain verification assets
├── .github/workflows/  # GitHub Actions for automated static content deployment
├── index.html          # Main application entry point
├── favicon.svg         # Custom vector glowing monogram favicon
└── README.md
