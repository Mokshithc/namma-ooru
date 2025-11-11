Namma Ooru
A civic engagement platform enabling citizens to report and track local community issues.

🌐 Live Demo: https://namma-ooru-c21n.onrender.com

📦 Repository: https://github.com/Mokshithc/namma-ooru

Overview
Namma Ooru (meaning "Our Town" in Kannada) is a web-based platform that allows citizens to report local infrastructure issues, safety concerns, and civic problems through an intuitive interface with photo capture and GPS location tracking. Administrators can manage and resolve reports through a dedicated dashboard.

Features
User authentication (register/login)

Report submission with RT camera capture

RT GPS location extraction

Real-time report status tracking

Admin dashboard for issue management

Interactive map visualization with Ola Maps

Tech Stack
Frontend: React 19, React Router, Axios, react-webcam

Backend: Node.js, Express, PostgreSQL

Authentication: JWT, bcrypt

Maps: Ola Maps API

Hosting: Render (Frontend + Backend)

Installation:

backend
npm install
Configure .env with DATABASE_URL, JWT_SECRET
npm start

Frontend
npm install
Configure .env with REACT_APP_API_URL
npm start

Usage
Citizens: Register → Submit reports with photos → Track status

Admins: Login → View all reports → Update status 

Contact
For issues or questions, visit the GitHub repository.

Version: 1.0.0 | Last Updated: November 2025
