# IntelHub — Pending Fixes & Improvements
## Last Updated: 2026-03-24

---

### 🔴 HIGH PRIORITY

1. **Safari crash on iPhone** — "A problem repeatedly occurred" error on iOS Safari. Likely caused by InstallPage component or service worker cache conflict. Needs investigation on a real iPhone.

2. **OCR partial save** — When 1 page fails (e.g., page 29 Gemini hallucination), extraction blocks at 97% and Save button never appears. Need to allow saving with skipped pages instead of blocking.

3. **Gender mismatch in synthetic data** — Synthetic data uses `M`/`F`, dashboard counts `MALE`/`FEMALE`. Run on server:
   ```bash
   docker compose -f docker-compose.remote.yml exec -T app python -c "
   import os; os.environ['DJANGO_SETTINGS_MODULE']='voter_vault.settings'
   import django; django.setup()
   from core_db.models import Voter
   m = Voter.objects.filter(gender='M', source_file='SYNTHETIC_DEMO_DATA').update(gender='Male')
   f = Voter.objects.filter(gender='F', source_file='SYNTHETIC_DEMO_DATA').update(gender='Female')
   print(f'Updated: {m} Male, {f} Female')
   "
   ```

4. **Gemini repetition bug** — Gemini 2.5 Flash occasionally enters infinite loop on Malayalam characters (e.g., "ആശമ്മ്മ്മ്മ്..." repeating forever), hits MAX_TOKENS, returns truncated JSON. Need to detect repetition pattern in response and retry single box.

5. **Gemini AFC interference** — "AFC is enabled with max remote calls: 10" appears after every failure. Automatic Function Calling may be interfering with extraction. Investigate disabling AFC in the Gemini client config.

---

### 🟡 MEDIUM PRIORITY

6. **SSL auto-renewal** — Let's Encrypt certs expire in 90 days. Add certbot auto-renewal cron:
   ```bash
   (crontab -l; echo "0 3 * * 1 docker compose -f /opt/voterslist/docker-compose.remote.yml run --rm certbot renew && docker compose -f /opt/voterslist/docker-compose.remote.yml exec nginx nginx -s reload") | crontab -
   ```

7. **Monitoring/alerting** — No notification when server crashes. Add UptimeRobot or similar free monitoring for intelhub.live with email/SMS alerts.

8. **Security headers test failing** — Post-deploy E2E test for security headers fails because `fetch()` from GitHub Actions CI can't read cross-origin headers. Options: use `curl` in deploy script instead, or skip this test.

9. **Backup restore testing** — Daily backups exist but never tested if they actually restore. Run a test restore to a temporary database.

10. **OCR retry backoff too long** — Current exponential backoff waits 10+ minutes between retries. For transient Gemini failures, shorter backoff (5-10 seconds) would resolve faster.

---

### 🟢 LOW PRIORITY

11. **Zero-downtime deploy** — Site goes offline 30-60s during every deploy. Use rolling update or blue-green deployment strategy.

12. **Load testing** — Configured for 5,000 concurrent users but never tested. Use k6 or Apache Bench to verify.

13. **Input validation on frontend** — Phone numbers, ages have no format validation. Add input masks.

14. **Audit log** — No record of who changed what voter data and when. Add audit trail table.

15. **Data encryption at rest** — PostgreSQL data is plaintext on disk. Enable pgcrypto or disk encryption.

16. **docker-compose.remote.yml `version` warning** — Remove the deprecated `version` attribute to suppress the WARN message.

---

### 📋 Demo Accounts (for reference)
- `demo_admin` / `demo2026` — SUPERUSER
- `demo_manager` / `demo2026` — MANAGER
- `booth_1` / `booth2026` — BOOTH_AGENT → Booth 001
- `booth_2` / `booth2026` — BOOTH_AGENT → Booth 002

### 🖥️ Server Details
- IP: 64.227.165.68
- Plan: 8 vCPU, 16 GB RAM, 320 GB Disk ($96/mo)
- App dir: /opt/voterslist
- Domain: intelhub.live
