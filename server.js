const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();




const allowedOrigins = [

  'http://localhost:3001',
  'http://localhost:3000',
  'http://192.168.1.16:3001',
  'http://192.168.1.16:3000',
 process.env.DEV_URL  
];


app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const reportRoutes = require('./routes/reportRoutes');
const authRoutes = require('./routes/authRoutes');  
const adminRoutes = require('./routes/adminRoutes');

// Use routes
app.use('/api/reports', reportRoutes);
app.use('/api/auth', authRoutes);  
app.use('/api/admin', adminRoutes);


app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});



app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; 

app.listen(PORT, () => {
  console.log('Server running on:');
  console.log(` ${process.env.HOST_URL}:${PORT}`);
});



