import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// import { checkAndSendAlerts } from './services/notification';
import schedule from 'node-schedule';

import db from "./db";
import authRoutes from "./routes/auth";
import { PORT } from "./config";
import accountRoutes from "./routes/accounts";
import billRoutes from "./routes/bills";
import incomeRoutes from "./routes/income";
import forecastRoutes from "./routes/forecast";

import notificationRoutes from './routes/notification';
import { checkAndSendAlerts } from './services/notification';

const allowedOrigins = ['https://birrflow-front.netlify.app'];

const app = express();

// Middleware
// app.use(cors());
app.use(cors({
  origin: allowedOrigins,
  credentials: true, // if you're using cookies or auth headers
}));

app.use(bodyParser.json());

// Test route
app.get("/", (req, res) => {
  res.send("BirrFlow API is running! 🚀");
});

// Routes
app.use("/api/auth", authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/notifications', notificationRoutes);

// Schedule daily alerts at 8:00 AM
schedule.scheduleJob('0 8 * * *', () => {
  console.log('Running scheduled alerts check');
  checkAndSendAlerts();
});

// For testing: Run immediately on startup in development
if (process.env.NODE_ENV === 'development') {
  checkAndSendAlerts();
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Database path:", db.name);
});
