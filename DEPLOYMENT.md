# Email Suite - Production Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Ubuntu 20.04+ server
- Docker & Docker Compose
- Domain name with DNS access
- Stripe account for payments
- SMTP service (SendGrid, Postmark, etc.)

### 1. Server Setup
```bash
# Run automated server setup
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh