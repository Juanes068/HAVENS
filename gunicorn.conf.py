"""Gunicorn configuration for production deployment on Hostinger VPS."""
import multiprocessing

# Bind to all interfaces on port 8000 (Nginx proxies to this)
bind = "0.0.0.0:8000"

# Number of worker processes: 2-4 × CPU cores is a good baseline
workers = multiprocessing.cpu_count() * 2 + 1

# Worker class: sync is stable; use gevent for high-concurrency if needed
worker_class = "sync"

# Max requests per worker before recycling (prevents memory leaks)
max_requests = 1000
max_requests_jitter = 100

# Timeout in seconds for a request to complete
timeout = 30

# Log level
loglevel = "info"
accesslog = "-"   # stdout
errorlog = "-"    # stderr

# Keep alive connections for Nginx upstream
keepalive = 5

# Preload app before forking workers (faster startup, lower memory)
preload_app = True
