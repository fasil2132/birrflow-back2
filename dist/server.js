"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
// import { checkAndSendAlerts } from './services/notification';
const node_schedule_1 = __importDefault(require("node-schedule"));
const db_1 = __importDefault(require("./db"));
const auth_1 = __importDefault(require("./routes/auth"));
const config_1 = require("./config");
const accounts_1 = __importDefault(require("./routes/accounts"));
const bills_1 = __importDefault(require("./routes/bills"));
const income_1 = __importDefault(require("./routes/income"));
const forecast_1 = __importDefault(require("./routes/forecast"));
const notification_1 = __importDefault(require("./routes/notification"));
const notification_2 = require("./services/notification");
const allowedOrigins = ['https://birrflow-front.netlify.app'];
const app = (0, express_1.default)();
// Middleware
// app.use(cors());
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true, // if you're using cookies or auth headers
}));
app.use(body_parser_1.default.json());
// Test route
app.get("/", (req, res) => {
    res.send("BirrFlow API is running! 🚀");
});
// Routes
app.use("/api/auth", auth_1.default);
app.use('/api/accounts', accounts_1.default);
app.use('/api/bills', bills_1.default);
app.use('/api/income', income_1.default);
app.use('/api/forecast', forecast_1.default);
app.use('/api/notifications', notification_1.default);
// Schedule daily alerts at 8:00 AM
node_schedule_1.default.scheduleJob('0 8 * * *', () => {
    console.log('Running scheduled alerts check');
    (0, notification_2.checkAndSendAlerts)();
});
// For testing: Run immediately on startup in development
if (process.env.NODE_ENV === 'development') {
    (0, notification_2.checkAndSendAlerts)();
}
// Start server
app.listen(config_1.PORT, () => {
    console.log(`Server running on http://localhost:${config_1.PORT}`);
    console.log("Database path:", db_1.default.name);
});
