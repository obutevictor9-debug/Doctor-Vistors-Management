const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const visitRoutes = require('./routes/visitRoutes');
const specializationRoutes = require('./routes/specializationRoutes'); // 1. Import
const dashboardRoutes = require('./routes/dashboardRoutes');           // 2. Import

const app = express();

app.use(cors());
app.use(express.json());

// Public static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/specializations', specializationRoutes); // 3. Mount
app.use('/api/dashboard', dashboardRoutes);             // 4. Mount

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;