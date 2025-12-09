document.addEventListener('DOMContentLoaded', () => {

    // ----------------------------
    // DOM elementi
    // ----------------------------
    const projectForm = document.getElementById('projectForm');
    const btnSpremi = document.getElementById('btnSpremiProjekt');
    const btnNoviProjekt = document.getElementById('btnNoviProjekt');
    const projectsTableBody = document.getElementById('projectsTableBody');
    const projectModalEl = document.getElementById('projectModal');
    const projectModalTitle = document.getElementById('projectModalTitle');
    const detailsModalEl = document.getElementById('detailsModal');
    const detailsContent = document.getElementById('detailsContent');
    const filterStatus = document.getElementById('filterStatus');
    const filterMinCijena = document.getElementById('filterMinCijena');
    const filterMaxCijena = document.getElementById('filterMaxCijena');
    const btnDodajPosao = document.getElementById('btnDodajPosao');
    const obavljeniPosloviContainer = document.getElementById('obavljeniPosloviContainer');
    const btnDodajClana = document.getElementById('btnDodajClana');
    const clanoviTimaContainer = document.getElementById('clanoviTimaContainer');
  
    const bsProjectModal = new bootstrap.Modal(projectModalEl);
    const bsDetailsModal = new bootstrap.Modal(detailsModalEl);
  
    btnOdustaniProjekt.addEventListener('click', () => {
        bsProjectModal.hide();
      });
    
      btnZatvoriDetalji.addEventListener('click', () => {
        bsDetailsModal.hide();
      });
    
    let editingProjectId = null;
  
    // ----------------------------
    // Funkcija za dohvat i render projekata
    // ----------------------------
    async function fetchProjects() {
      projectsTableBody.innerHTML = '<tr><td colspan="8">Učitavanje...</td></tr>';
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
          data.data.forEach(project => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${project.naziv}</td>
              <td>${project.opis}</td>
              <td>${project.cijena}</td>
              <td>${project.status}</td>
              <td>${project.datumPocetka ? new Date(project.datumPocetka).toLocaleDateString() : ''}</td>
              <td>${project.datumZavrsetka ? new Date(project.datumZavrsetka).toLocaleDateString() : ''}</td>
              <td>${project.clanoviTima ? project.clanoviTima.join(", ") : ""}</td>
              <td>
                <button class="btn btn-sm btn-info btn-details" data-id="${project._id}">Detalji</button>
                <button class="btn btn-sm btn-warning btn-edit" data-id="${project._id}">Uredi</button>
                <button class="btn btn-sm btn-danger btn-delete" data-id="${project._id}">Obriši</button>
              </td>
            `;
            projectsTableBody.appendChild(tr);
          });
        } else {
          projectsTableBody.innerHTML = '<tr><td colspan="8">Nema projekata</td></tr>';
        }
  
      } catch (err) {
        console.error(err);
        projectsTableBody.innerHTML = '<tr><td colspan="8">Greška pri dohvaćanju projekata</td></tr>';
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
      clearClanoviTima();
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
    // Dodavanje polja za člana tima
    // ----------------------------
    btnDodajClana.addEventListener('click', () => {
      const div = document.createElement('div');
      div.classList.add('input-group', 'mb-2');
      div.innerHTML = `
        <input type="text" class="form-control clan-tima" placeholder="Ime člana tima">
        <button class="btn btn-danger btn-sm btn-remove-clan" type="button">X</button>
      `;
      div.querySelector('.btn-remove-clan').addEventListener('click', () => div.remove());
      clanoviTimaContainer.appendChild(div);
    });
  
    // ----------------------------
    // Spremanje projekta
    // ----------------------------
    btnSpremi.addEventListener('click', async (e) => {
      e.preventDefault();
  
      let projectData = {
        naziv: document.getElementById('naziv').value,
        opis: document.getElementById('opis').value,
        cijena: document.getElementById('cijena').value,
        obavljeniPoslovi: Array.from(document.querySelectorAll('.obavljeni-posao'))
                               .map(input => input.value)
                               .filter(v => v),
        clanoviTima: Array.from(document.querySelectorAll('.clan-tima'))
                           .map(input => input.value)
                           .filter(v => v),
        status: document.getElementById('status').value,
        datumPocetka: document.getElementById('datumPocetka').value,
        datumZavrsetka: document.getElementById('datumZavrsetka').value
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
          clearClanoviTima();
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
      const target = e.target;
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
  
            populateObavljeniPoslovi(project.obavljeniPoslovi);
            populateClanoviTima(project.clanoviTima);
  
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
            detailsContent.innerHTML = `
              <p><strong>Naziv:</strong> ${project.naziv}</p>
              <p><strong>Opis:</strong> ${project.opis}</p>
              <p><strong>Cijena:</strong> ${project.cijena} EUR</p>
              <p><strong>Status:</strong> ${project.status}</p>
              <p><strong>Datum početka:</strong> ${project.datumPocetka ? new Date(project.datumPocetka).toLocaleDateString() : ''}</p>
              <p><strong>Datum završetka:</strong> ${project.datumZavrsetka ? new Date(project.datumZavrsetka).toLocaleDateString() : ''}</p>
              <p><strong>Obavljeni poslovi:</strong> ${project.obavljeniPoslovi ? project.obavljeniPoslovi.join(", ") : ""}</p>
              <p><strong>Članovi tima:</strong> ${project.clanoviTima ? project.clanoviTima.join(", ") : ""}</p>
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
  
    // ----------------------------
    // Reset modal na zatvaranje
    // ----------------------------
    projectModalEl.addEventListener('hidden.bs.modal', () => {
      projectForm.reset();
      editingProjectId = null;
      projectModalTitle.innerText = 'Novi Projekt';
      clearObavljeniPoslovi();
      clearClanoviTima();
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
  
    function clearClanoviTima() {
      clanoviTimaContainer.innerHTML = `
        <div class="input-group mb-2">
          <input type="text" class="form-control clan-tima" placeholder="Ime člana tima">
        </div>
      `;
    }
  
    function populateClanoviTima(clanovi) {
      clearClanoviTima();
      if (!clanovi || clanovi.length === 0) return;
      clanoviTimaContainer.innerHTML = '';
      clanovi.forEach(c => {
        const div = document.createElement('div');
        div.classList.add('input-group', 'mb-2');
        div.innerHTML = `
          <input type="text" class="form-control clan-tima" value="${c}">
          <button class="btn btn-danger btn-sm btn-remove-clan" type="button">X</button>
        `;
        div.querySelector('.btn-remove-clan').addEventListener('click', () => div.remove());
        clanoviTimaContainer.appendChild(div);
      });
    }
    
  
    // ----------------------------
    // Inicijalni fetch
    // ----------------------------
    fetchProjects();
  
  });
  

  