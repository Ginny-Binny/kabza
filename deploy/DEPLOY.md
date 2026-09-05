# deploying to a vps

Assumes ubuntu-ish with nginx already running. Node 20+ required.

```sh
# node 20 if missing
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# app user + dirs
sudo useradd -r -m -d /opt/kabza kabza
sudo mkdir -p /var/lib/kabza && sudo chown kabza /var/lib/kabza

# code
sudo -u kabza git clone https://github.com/Ginny-Binny/kabza /opt/kabza
cd /opt/kabza
sudo -u kabza npm ci
sudo -u kabza npm run build

# service
sudo cp deploy/kabza.service /etc/systemd/system/
sudo systemctl edit kabza          # set the real ADMIN_TOKEN here
sudo systemctl enable --now kabza
curl localhost:8090/healthz        # should answer

# tls + nginx (change the domain in the conf first)
sudo cp deploy/nginx.kabza.conf /etc/nginx/sites-available/kabza
sudo ln -s /etc/nginx/sites-available/kabza /etc/nginx/sites-enabled/
sudo certbot certonly --nginx -d kabza.example.com
sudo nginx -t && sudo systemctl reload nginx
```

Then open the domain — the board should appear and claims should
propagate between two devices. `wss://` works automatically because the
client connects to `location.host` with the page's own scheme.

Updating: `git pull && npm ci && npm run build && sudo systemctl restart kabza`.
The board survives restarts (sqlite replay), so a deploy mid-round is fine.
