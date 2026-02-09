import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI usage endpoints will go here
app.get('/api/usage', (req, res) => {
  res.json({ message: 'AI usage data will be here' });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Dashboard API running on port ${PORT}`);
});
