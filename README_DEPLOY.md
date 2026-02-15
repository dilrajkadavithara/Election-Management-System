# 🚀 Deployment Guide - Voter OCR Pro

This guide explains how to deploy the system to your production server (`intelhub.live`) with Nginx and SSL.

## 1. Initial Setup
The system is ready for Docker-based deployment. The `docker-compose.yml` now includes an Nginx reverse proxy.

### **Server Prerequisites:**
- Docker & Docker Compose installed.
- Domain `intelhub.live` pointing to your server IP.
- Ports 80 and 443 open in your firewall.

---

## 2. Deploying with SSH (GitHub Actions)
The system is configured to auto-deploy when you push to the `master` branch.
1. Ensure `SERVER_IP` and `SSH_PRIVATE_KEY` are set in GitHub Secrets.
2. Push your changes: `git push origin master`.

---

## 3. Setting Up SSL (HTTPS)
To enable HTTPS, you need to generate certificates using Certbot.

### **Manual initialization (First time only):**
1. SSH into your server.
2. Run the following command to get a certificate:
   ```bash
   docker run -it --rm --name certbot \
     -v "/opt/voterslist/certbot/conf:/etc/letsencrypt" \
     -v "/opt/voterslist/certbot/www:/var/www/certbot" \
     certbot/certbot certonly --webroot -w /var/www/certbot \
     -d intelhub.live -d www.intelhub.live
   ```
3. Update `nginx/nginx.conf` to use the certificates (see Phase 2 below).
4. Restart Nginx: `docker compose restart nginx`.

---

## 4. Post-Deployment Steps
### **Create Superuser:**
After the first deploy, create your admin account:
```bash
docker exec -it voterslist-app-1 python scripts/create_superuser.py --password your_secure_password
```

### **Health Check:**
Visit `https://intelhub.live/api/health` to verify the backend is running.
