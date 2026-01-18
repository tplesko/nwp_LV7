document.addEventListener('DOMContentLoaded', () => {

  const projectsTableBody = document.getElementById('projectsTableBody');
  if (!projectsTableBody) {
    // Korisnik nije prijavljen, ne pokreći JS
    return;
  }

  // ----------------------------
  // DOM elementi
  // ----------------------------
  const projectForm = document.getElementById('projectForm');
  const btnSpremi = document.getElementById('btnSpremiProjekt');
  const btnNoviProjekt = document.getElementById('btnNoviProjekt');  const projectModalEl = document.getElementById('projectModal');
  const projectModalTitle = document.getElementById('projectModalTitle');
  const detailsModalEl = document.getElementById('detailsModal');
  const detailsContent = document.getElementById('detailsContent');
  const filterStatus = document.getElementById('filterStatus');
  const filterMinCijena = document.getElementById('filterMinCijena');
  const filterMaxCijena = document.getElementById('filterMaxCijena');
  const filterArhiviran = document.getElementById('filterArhiviran');
  const btnDodajPosao = document.getElementById('btnDodajPosao');
  const obavljeniPosloviContainer = document.getElementById('obavljeniPosloviContainer');
  const clanoviTimaSelect = document.getElementById('clanoviTimaSelect');

  const bsProjectModal = new bootstrap.Modal(projectModalEl);
  const bsDetailsModal = new bootstrap.Modal(detailsModalEl);

  btnOdustaniProjekt.addEventListener('click', () => {
      bsProjectModal.hide();
  });
  
  btnZatvoriDetalji.addEventListener('click', () => {
      bsDetailsModal.hide();
  });
  
  let editingProjectId = null;
  let allUsers = []; // Globalna lista svih korisnika

  // ----------------------------
  // Dohvati sve korisnike
  // ----------------------------
  async function loadUsers() {
    try {
      const response = await fetch('/api/projects/users/all');
      const result = await response.json();
      if (result.success) {
        allUsers = result.data;
        populateUsersDropdown();
      }
    } catch (error) {
      console.error('Greška pri dohvaćanju korisnika:', error);
    }
  }

  // ----------------------------
  // Popuni dropdown s korisnicima
  // ----------------------------
  function populateUsersDropdown() {
    clanoviTimaSelect.innerHTML = '';
    
    allUsers.forEach(user => {
      const option = document.createElement('option');
      option.value = user._id;
      option.textContent = `${user.username} (${user.email})`;
      clanoviTimaSelect.appendChild(option);
    });
  }

  // ----------------------------
  // Funkcija za dohvat i render projekata
  // ----------------------------
  async function fetchProjects() {
    projectsTableBody.innerHTML = '<tr><td colspan="9">Učitavanje...</td></tr>';
    try {
      let url = '/api/projects';
      const status = filterStatus.value;
      const min = filterMinCijena.value;
      const max = filterMaxCijena.value;

      if (status) url = `/api/projects/status/${status}`;
      else if (min || max) url = `/api/projects/cijena/${min || 0}/${max || 1000000}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.count > 0) {
        projectsTableBody.innerHTML = '';
        
        // Filtriraj po arhiviranom statusu
        let filteredProjects = data.data;
        if (filterArhiviran.value !== '') {
          const isArhiviran = filterArhiviran.value === 'true';
          filteredProjects = data.data.filter(p => p.arhiviran === isArhiviran);
        }
        
        filteredProjects.forEach(project => {
          const tr = document.createElement('tr');
          
          // Formatiraj članove tima
          const clanoviText = project.clanoviTima && project.clanoviTima.length > 0
            ? project.clanoviTima.map(c => c.username).join(', ')
            : 'Nema članova';
          
          // Status badge boja
          const statusClass = {
            'planiran': 'bg-secondary',
            'u_tijeku': 'bg-primary',
            'zavrsen': 'bg-success',
            'otkazan': 'bg-danger'
          }[project.status] || 'bg-secondary';
          
          tr.innerHTML = `
            <td>${project.naziv}</td>
            <td>${project.opis.substring(0, 50)}${project.opis.length > 50 ? '...' : ''}</td>
            <td>${project.cijena.toFixed(2)} €</td>
            <td><span class="badge ${statusClass}">${project.status}</span></td>
            <td>${project.datumPocetka ? new Date(project.datumPocetka).toLocaleDateString('hr-HR') : ''}</td>
            <td>${project.datumZavrsetka ? new Date(project.datumZavrsetka).toLocaleDateString('hr-HR') : '-'}</td>
            <td>${clanoviText}</td>
            <td>${project.arhiviran ? '<span class="badge bg-warning text-dark">DA</span>' : '<span class="badge bg-success">NE</span>'}</td>
            <td>
              <button class="btn btn-sm btn-info btn-details" data-id="${project._id}">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-warning btn-edit" data-id="${project._id}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-danger btn-delete" data-id="${project._id}">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          `;
          projectsTableBody.appendChild(tr);
        });
        
        if (filteredProjects.length === 0) {
          projectsTableBody.innerHTML = '<tr><td colspan="9">Nema projekata koji odgovaraju filteru</td></tr>';
        }
      } else {
        projectsTableBody.innerHTML = '<tr><td colspan="9">Nema projekata</td></tr>';
      }

    } catch (err) {
      console.error(err);
      projectsTableBody.innerHTML = '<tr><td colspan="9">Greška pri dohvaćanju projekata</td></tr>';
    }
  }

  // ----------------------------
  // Modal za novi projekt
  // ----------------------------
  btnNoviProjekt.addEventListener('click', () => {
    projectForm.reset();
    editingProjectId = null;
    projectModalTitle.innerText = 'Novi Projekt';
    clearObavljeniPoslovi();
    clearSelectedUsers();
    document.getElementById('arhiviran').checked = false;
    bsProjectModal.show();
  });

  // ----------------------------
  // Dodavanje polja za obavljeni posao
  // ----------------------------
  btnDodajPosao.addEventListener('click', () => {
    const div = document.createElement('div');
    div.classList.add('input-group', 'mb-2');
    div.innerHTML = `
      <input type="text" class="form-control obavljeni-posao" placeholder="Npr. Dizajn">
      <button class="btn btn-danger btn-sm btn-remove-posao" type="button">X</button>
    `;
    div.querySelector('.btn-remove-posao').addEventListener('click', () => div.remove());
    obavljeniPosloviContainer.appendChild(div);
  });

  // ----------------------------
  // Spremanje projekta
  // ----------------------------
  btnSpremi.addEventListener('click', async (e) => {
    e.preventDefault();

    // Dohvati odabrane članove tima
    const selectedOptions = Array.from(clanoviTimaSelect.selectedOptions);
    const clanoviTima = selectedOptions.map(option => option.value);
    
    const arhiviran = document.getElementById('arhiviran').checked;

    let projectData = {
      naziv: document.getElementById('naziv').value,
      opis: document.getElementById('opis').value,
      cijena: document.getElementById('cijena').value,
      obavljeniPoslovi: Array.from(document.querySelectorAll('.obavljeni-posao'))
                             .map(input => input.value)
                             .filter(v => v),
      clanoviTima: clanoviTima,
      status: document.getElementById('status').value,
      datumPocetka: document.getElementById('datumPocetka').value,
      datumZavrsetka: document.getElementById('datumZavrsetka').value,
      arhiviran: arhiviran
    };

    // ----------------------------
    // NORMALIZE TYPES
    // ----------------------------
    if (projectData.cijena) projectData.cijena = Number(projectData.cijena);
    if (projectData.datumPocetka) projectData.datumPocetka = new Date(projectData.datumPocetka);
    if (projectData.datumZavrsetka) projectData.datumZavrsetka = new Date(projectData.datumZavrsetka);

    // ----------------------------
    // REMOVE EMPTY FIELDS
    // ----------------------------
    Object.keys(projectData).forEach(key => {
      if (projectData[key] === "" || projectData[key] === undefined || projectData[key] === null) {
        delete projectData[key];
      }
    });

    console.log("Final projectData being sent to DB:", projectData);

    try {
      let res;
      if (editingProjectId) {
        res = await fetch(`/api/projects/${editingProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });
      } else {
        res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });
      }

      const data = await res.json();
      if (data.success) {
        alert(editingProjectId ? 'Projekt uspješno ažuriran!' : 'Projekt uspješno kreiran!');
        bsProjectModal.hide();
        projectForm.reset();
        clearObavljeniPoslovi();
        clearSelectedUsers();
        editingProjectId = null;
        fetchProjects();
      } else {
        alert(data.message || 'Greška pri spremanju projekta.');
      }
    } catch (err) {
      console.error(err);
      alert('Greška pri spremanju projekta.');
    }
  });

  // ----------------------------
  // Edit / Delete / Details (event delegation)
  // ----------------------------
  projectsTableBody.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    const id = target.dataset.id;
    if (!id) return;

    // EDIT
    if (target.classList.contains('btn-edit')) {
      try {
        const res = await fetch(`/api/projects/${id}`);
        const data = await res.json();
        if (data.success) {
          const project = data.data;

          document.getElementById('naziv').value = project.naziv;
          document.getElementById('opis').value = project.opis;
          document.getElementById('cijena').value = project.cijena;
          document.getElementById('status').value = project.status;
          document.getElementById('datumPocetka').value = project.datumPocetka
            ? new Date(project.datumPocetka).toISOString().slice(0, 10)
            : '';
          document.getElementById('datumZavrsetka').value = project.datumZavrsetka
            ? new Date(project.datumZavrsetka).toISOString().slice(0, 10)
            : '';
          document.getElementById('arhiviran').checked = project.arhiviran || false;

          populateObavljeniPoslovi(project.obavljeniPoslovi);
          
          // Postavi odabrane članove tima
          if (project.clanoviTima && project.clanoviTima.length > 0) {
            const clanoviIds = project.clanoviTima.map(c => c._id);
            Array.from(clanoviTimaSelect.options).forEach(option => {
              option.selected = clanoviIds.includes(option.value);
            });
          } else {
            clearSelectedUsers();
          }

          editingProjectId = project._id;
          projectModalTitle.innerText = 'Uredi Projekt';
          bsProjectModal.show();
        }
      } catch (err) {
        console.error(err);
      }
    }

    // DELETE
    if (target.classList.contains('btn-delete')) {
      if (confirm("Jeste li sigurni da želite obrisati projekt?")) {
        try {
          const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) fetchProjects();
        } catch (err) {
          console.error(err);
        }
      }
    }

    // DETAILS
    if (target.classList.contains('btn-details')) {
      try {
        const res = await fetch(`/api/projects/${id}`);
        const data = await res.json();
        if (data.success) {
          const project = data.data;
          
          const clanoviText = project.clanoviTima && project.clanoviTima.length > 0
            ? project.clanoviTima.map(c => `${c.username} (${c.email})`).join(', ')
            : 'Nema članova';
          
          detailsContent.innerHTML = `
            <p><strong>Naziv:</strong> ${project.naziv}</p>
            <p><strong>Opis:</strong> ${project.opis}</p>
            <p><strong>Cijena:</strong> ${project.cijena} EUR</p>
            <p><strong>Status:</strong> ${project.status}</p>
            <p><strong>Datum početka:</strong> ${project.datumPocetka ? new Date(project.datumPocetka).toLocaleDateString('hr-HR') : ''}</p>
            <p><strong>Datum završetka:</strong> ${project.datumZavrsetka ? new Date(project.datumZavrsetka).toLocaleDateString('hr-HR') : '-'}</p>
            <p><strong>Obavljeni poslovi:</strong> ${project.obavljeniPoslovi && project.obavljeniPoslovi.length > 0 ? project.obavljeniPoslovi.join(", ") : "Nema"}</p>
            <p><strong>Članovi tima:</strong> ${clanoviText}</p>
            <p><strong>Arhiviran:</strong> ${project.arhiviran ? 'DA' : 'NE'}</p>
            <p><strong>Vlasnik:</strong> ${project.owner ? project.owner.username : 'N/A'}</p>
          `;
          bsDetailsModal.show();
        }
      } catch (err) {
        console.error(err);
      }
    }
  });

  // ----------------------------
  // Filteri
  // ----------------------------
  filterStatus.addEventListener('change', fetchProjects);
  filterMinCijena.addEventListener('input', fetchProjects);
  filterMaxCijena.addEventListener('input', fetchProjects);
  filterArhiviran.addEventListener('change', fetchProjects);

  // ----------------------------
  // Reset modal na zatvaranje
  // ----------------------------
  projectModalEl.addEventListener('hidden.bs.modal', () => {
    projectForm.reset();
    editingProjectId = null;
    projectModalTitle.innerText = 'Novi Projekt';
    clearObavljeniPoslovi();
    clearSelectedUsers();
  });

  // ----------------------------
  // Helper functions
  // ----------------------------
  function clearObavljeniPoslovi() {
    obavljeniPosloviContainer.innerHTML = `
      <div class="input-group mb-2">
        <input type="text" class="form-control obavljeni-posao" placeholder="Npr. Dizajn">
      </div>
    `;
  }

  function populateObavljeniPoslovi(poslovi) {
    clearObavljeniPoslovi();
    if (!poslovi || poslovi.length === 0) return;
    obavljeniPosloviContainer.innerHTML = '';
    poslovi.forEach(p => {
      const div = document.createElement('div');
      div.classList.add('input-group', 'mb-2');
      div.innerHTML = `
        <input type="text" class="form-control obavljeni-posao" value="${p}">
        <button class="btn btn-danger btn-sm btn-remove-posao" type="button">X</button>
      `;
      div.querySelector('.btn-remove-posao').addEventListener('click', () => div.remove());
      obavljeniPosloviContainer.appendChild(div);
    });
  }
  
  function clearSelectedUsers() {
    Array.from(clanoviTimaSelect.options).forEach(option => {
      option.selected = false;
    });
  }

  // ----------------------------
  // Inicijalni fetch
  // ----------------------------
  loadUsers();
  fetchProjects();

});