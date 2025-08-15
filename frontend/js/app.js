const API = 'https://admin-panel-young.onrender.com/api';
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

async function loadUsers() {
  const res = await axios.get(`${API}/users`);
  const tbody = document.getElementById('usersTable');
  tbody.innerHTML = res.data.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>
        <button class="btn btn-sm btn-warning" onclick="editUser(${u.id})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function addUser() {
  const name = prompt('Имя:');
  const email = prompt('Email:');
  if (name && email) {
    await axios.post(`${API}/users`, { name, email });
    loadUsers();
  }
}

async function deleteUser(id) {
  if (confirm('Удалить?')) {
    await axios.delete(`${API}/users/${id}`);
    loadUsers();
  }
}

async function exportToExcel() {
  window.location.href = `${API}/users/export`;
}


loadUsers();
