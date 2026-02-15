# 🧪 Staging Environment Secret Stack

To connect the system to your Cloud Staging environment while keeping your local PC safe, you need to configure these secrets in your **GitHub Repository Settings** (Settings > Secrets and Variables > Actions).

## 1. Required GitHub Secrets
These secrets allow the CI/CD pipeline to push code to your Cloud VPS securely.

| Secret Name | Description | Example |
| :--- | :--- | :--- |
| `SSH_PRIVATE_KEY` | Private Key for your Cloud VPS | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SERVER_IP` | The IP address of your Staging VPS | `159.203.x.x` |
| `DATABASE_URL` | The Cloud Managed Database Link | `postgres://user:pass@host:port/db` |
| `JWT_SECRET` | A long random string for auth security | `a-very-secret-string-123` |
| `SECRET_KEY` | Django Secret Key | `django-insecure-xxx` |

---

## 2. Setting up the "Safe Place" Local Override
On your local PC, your `.env` file should remain **local-focused**. 
The software is now programmed to:
1.  Check for `DATABASE_URL` (Cloud Mode).
2.  If not found, fall back to individual `DB_NAME`, `DB_USER` (Local Mode).

**Action Item**: Create a `.env.staging` file on your PC (Git will ignore it) to store these credentials for manual testing.

---

## 3. The Migration Gate Logic
The `server.py` has been updated with a **Migration Gate**. 
*   **How it works**: Every time the Staging/Production server restarts, it automatically checks your `voter_vault/core_db/migrations` folder. 
*   **Efficiency**: It applies only new changes. You never have to manually run "migrate" on the server. If it fails, the server won't start, preventing you from serving a broken site to users.
