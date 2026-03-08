# The Fed Chair - Deployment Guide

This application is a React-based interactive browser game. To deploy it to Render using Docker, follow these steps:

## Prerequisites
- A GitHub account
- A Render account (connected to your GitHub)

## Deployment Steps

1. **Push to GitHub**: Upload this entire project directory to a new repository on GitHub.
2. **Connect to Render**:
   - Log in to your [Render Dashboard](https://dashboard.render.com/).
   - Click **New +** and select **Web Service**.
   - Connect your GitHub repository.
   - Render should automatically detect the `Dockerfile` and `render.yaml`.
3. **Configure Settings**:
   - **Environment**: Docker
   - **Port**: 80 (Render usually detects this automatically from the Dockerfile)
4. **Deploy**: Click **Create Web Service**.

## Docker Configuration
- **Dockerfile**: Uses a multi-stage build to compile the React app and serve it using Nginx.
- **nginx.conf**: Configured to serve static files and handle client-side routing.
- **render.yaml**: A Blueprint file that pre-configures the service settings for Render.

## Local Testing
If you have Docker installed locally, you can test the build with:
```bash
docker build -t the-fed-chair .
docker run -p 8080:80 the-fed-chair
```
Then visit `http://localhost:8080` in your browser.
