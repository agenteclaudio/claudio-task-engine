const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8099;
const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');
const SRC_DIR = path.join(__dirname, 'src');

const MIME = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json'};

const server = http.createServer((req, res) => {
  if (req.url === '/api/tasks') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(fs.readFileSync(TASKS_FILE));
    return;
  }
  const file = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(SRC_DIR, file);
  const ext = path.extname(filePath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {'Content-Type': MIME[ext] || 'text/plain'});
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => console.log(`CTE Kanban running on http://localhost:${PORT}`));
