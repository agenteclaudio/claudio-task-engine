const COLUMNS = [
  {key:'todo',label:'To Do'},
  {key:'in-progress',label:'In Progress'},
  {key:'blocked',label:'Blocked'},
  {key:'done',label:'Done'}
];

let tasks = [];
const filters = {project:'',priority:'',status:''};

async function init() {
  const res = await fetch('/api/tasks');
  tasks = await res.json();
  populateFilters();
  render();
  document.getElementById('filter-project').addEventListener('change', e => { filters.project = e.target.value; render(); });
  document.getElementById('filter-priority').addEventListener('change', e => { filters.priority = e.target.value; render(); });
  document.getElementById('filter-status').addEventListener('change', e => { filters.status = e.target.value; render(); });
}

function populateFilters() {
  const projects = [...new Set(tasks.map(t => t.project))].sort();
  const priorities = [...new Set(tasks.map(t => t.priority))];
  const statuses = [...new Set(tasks.map(t => t.status))];
  const pSel = document.getElementById('filter-project');
  const prSel = document.getElementById('filter-priority');
  const sSel = document.getElementById('filter-status');
  projects.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; pSel.appendChild(o); });
  priorities.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; prSel.appendChild(o); });
  statuses.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s.replace('-',' '); sSel.appendChild(o); });
}

function filtered() {
  return tasks.filter(t =>
    (!filters.project || t.project === filters.project) &&
    (!filters.priority || t.priority === filters.priority) &&
    (!filters.status || t.status === filters.status)
  );
}

function render() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  const ft = filtered();
  COLUMNS.forEach(col => {
    const colTasks = ft.filter(t => t.status === col.key);
    const div = document.createElement('div');
    div.className = `column ${col.key}`;
    div.innerHTML = `
      <div class="column-header">
        <span class="column-title">${col.label}</span>
        <span class="column-count">${colTasks.length}</span>
      </div>
      <div class="cards">
        ${colTasks.length ? colTasks.map(cardHTML).join('') : '<div class="empty">No tasks</div>'}
      </div>`;
    board.appendChild(div);
  });
}

function cardHTML(t) {
  return `<div class="card">
    <div class="card-id">${t.id}</div>
    <div class="card-title">${t.title}</div>
    <div class="card-desc">${t.description}</div>
    <div class="card-meta">
      <span class="badge badge-project">${t.project}</span>
      <span class="badge badge-${t.priority}">${t.priority}</span>
    </div>
  </div>`;
}

init();
