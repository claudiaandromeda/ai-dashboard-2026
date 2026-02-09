# AI Usage Dashboard

A comprehensive monitoring dashboard for tracking AI service usage, costs, and tokens across multiple providers.

## Features

- 🔍 **Multi-Service Support**: Track usage across OpenAI, Anthropic, Gemini, Kimi, Grok, and ElevenLabs
- 💰 **Cost Tracking**: Real-time cost monitoring with monthly/weekly/daily breakdowns
- 📊 **Visual Analytics**: Interactive charts and dashboards for usage visualization
- 🔔 **Smart Alerts**: Configurable spending limits and notifications
- 🔐 **Secure Authentication**: OAuth integration with all supported services
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🐳 **Docker Ready**: Easy deployment with Docker configuration

## Quick Start

1. Install dependencies: `npm install`
2. Set up environment variables (see .env.example)
3. Run backend: `cd backend && npm run dev`
4. Run frontend: `cd frontend && npm run dev`
5. Open http://localhost:5173

## Configuration

Copy `.env.example` to `.env` and add your API keys for the AI services you want to monitor.
