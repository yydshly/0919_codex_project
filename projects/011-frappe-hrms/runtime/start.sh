#!/usr/bin/env bash
set -euo pipefail
if [ "$(id -u)" = 0 ]; then
  chown frappe:frappe /home/frappe/hrms-workspace
  exec runuser -u frappe -- bash /workspace/start.sh
fi
if [ -n "${NVM_DIR:-}" ]; then
  # Use the modern Node version shipped in the official Bench image.
  node_bin=$(find "$NVM_DIR/versions/node" -maxdepth 3 -name node -type f | sort -V | tail -1)
  if [ -n "$node_bin" ]; then export PATH="$(dirname "$node_bin"):$PATH"; fi
fi
cd /home/frappe/hrms-workspace
if [ -d frappe-bench ] && [ ! -f frappe-bench/apps/frappe/frappe/__init__.py ]; then
  mv frappe-bench "frappe-bench-interrupted-$(date +%s)"
fi
if [ ! -d frappe-bench/apps/frappe ]; then
  bench init --frappe-branch version-16 --skip-assets --skip-redis-config-generation frappe-bench
fi
cd frappe-bench
if ! env/bin/python -c 'import frappe' >/dev/null 2>&1; then
  uv pip install -e apps/frappe --python env/bin/python
fi
if [ ! -d apps/frappe/node_modules ]; then
  (cd apps/frappe && yarn install --check-files --network-timeout 120000 --registry https://registry.npmjs.org)
fi
if ! grep -qx frappe sites/apps.txt 2>/dev/null; then printf 'frappe\n' >> sites/apps.txt; fi
bench set-config -g db_host db
bench set-config -g redis_cache redis://redis:6379/0
bench set-config -g redis_queue redis://redis:6379/1
bench set-config -g redis_socketio redis://redis:6379/1
bench set-config -gp socketio_port 9191
bench set-config -gp webserver_port 8000
bench set-config -gp serve_default_site 1
if [ ! -d apps/erpnext ]; then bench get-app --branch version-16 --skip-assets https://github.com/frappe/erpnext; fi
if [ ! -d apps/hrms ]; then bench get-app --branch version-16 --skip-assets https://github.com/frappe/hrms; fi
if [ ! -f .hrms-assets-ready ]; then
  bench build
  touch .hrms-assets-ready
fi
if [ ! -f sites/hrms.localhost/site_config.json ]; then
  bench new-site hrms.localhost --db-root-password "$HRMS_DB_PASSWORD" --admin-password "$HRMS_ADMIN_PASSWORD" --mariadb-user-host-login-scope '%' --no-mariadb-socket
fi
if [ ! -f .hrms-installed ]; then
  bench --site hrms.localhost install-app erpnext
  bench --site hrms.localhost install-app hrms
  touch .hrms-installed
fi
bench use hrms.localhost
bench --site hrms.localhost set-config host_name http://127.0.0.1:8191
bench --site hrms.localhost set-config enable_telemetry 0
bench --site hrms.localhost enable-scheduler
sed -i '/^redis_/d; /^watch:/d; s/^web:.*/web: bench serve --port 8000/' Procfile
exec bench start
