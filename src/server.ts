import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// import { checkAndSendAlerts } from './services/notification';
import schedule from 'node-schedule';

import db from "./db";
import authRoutes from "./routes/auth";
import accountRoutes from "./routes/accounts";
import billRoutes from "./routes/bills";
import incomeRoutes from "./routes/income";
import forecastRoutes from "./routes/forecast";
import savingsRoutes from "./routes/savings";
import notificationRoutes from './routes/notification';
import educationRoutes from './routes/education';
import communityRoutes from './routes/community';
import paymentRoutes from './routes/payment';
import rateRoutes from './routes/rates';
import preferencesRoute from "./routes/preferences";
import adminRoutes from "./routes/admin";
import userRoutes from "./routes/user";
import budgetRoutes from "./routes/budget";

import { PORT } from "./config";
import { checkAndSendAlerts } from './services/notification';

// const allowedOrigins = ['https://birrflow-front.netlify.app'];

const app = express();

// Middleware
app.use(cors());
// app.use(cors({
//   origin: allowedOrigins,
//   credentials: true, // if you're using cookies or auth headers
// }));

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
app.use('/api/savings', savingsRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/preferences', preferencesRoute);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/budget', budgetRoutes)

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
