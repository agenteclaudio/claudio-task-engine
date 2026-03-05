import http.server, json, os

PORT = 8099
BASE = os.path.dirname(os.path.abspath(__file__))
TASKS = os.path.join(BASE, 'data', 'tasks.json')
SRC = os.path.join(BASE, 'src')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=SRC, **kw)

    def do_GET(self):
        if self.path == '/api/tasks':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            with open(TASKS, 'rb') as f:
                self.wfile.write(f.read())
        else:
            super().do_GET()

    def log_message(self, fmt, *args):
        pass

print(f"CTE Kanban running on http://localhost:{PORT}")
http.server.HTTPServer(('', PORT), Handler).serve_forever()
