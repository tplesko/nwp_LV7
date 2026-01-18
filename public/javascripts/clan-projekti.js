document.addEventListener('DOMContentLoaded', () => {
    const projectsTableBody = document.getElementById('projectsTableBody');
    const obavljeniPosloviModalEl = document.getElementById('obavljeniPosloviModal');
    const detailsModalEl = document.getElementById('detailsModal');
    const detailsContent = document.getElementById('detailsContent');
    const btnSpremiPoslove = document.getElementById('btnSpremiPoslove');
    const btnDodajPosao = document.getElementById('btnDodajPosao');
    const obavljeniPosloviContainer = document.getElementById('obavljeniPosloviContainer');
    
    const bsObavljeniModal = new bootstrap.Modal(obavljeniPosloviModalEl);
    const bsDetailsModal = new bootstrap.Modal(detailsModalEl);
    
    let editingProjectId = null;
    
    btnOdustaniPoslovi.addEventListener('click', () => {
      bsObavljeniModal.hide();
    });
    
    btnZatvoriDetalji.addEventListener('click', () => {
      bsDetailsModal.hide();
    });
    
    // Dohvati projekte na kojima sam član
    async function fetchProjects() {
      projectsTableBody.innerHTML = '<tr><td colspan="8">Učitavanje...</td></tr>';
      try {
        const res = await fetch('/api/projects/member/projects');
        const data = await res.json();
        
        if (data.success && data.count > 0) {
          projectsTableBody.innerHTML = '';
          
          data.data.forEach(project => {
            const tr = document.createElement('tr');
            
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
              <td>${project.owner ? project.owner.username : 'N/A'}</td>
              <td>
                <button class="btn btn-sm btn-info btn-details" data-id="${project._id}">
                  <i class="fas fa-eye"></i> Detalji
                </button>
                <button class="btn btn-sm btn-warning btn-edit-poslovi" data-id="${project._id}">
                  <i class="fas fa-edit"></i> Uredi poslove
                </button>
              </td>
            `;
            projectsTableBody.appendChild(tr);
          });
        } else {
          projectsTableBody.innerHTML = '<tr><td colspan="8">Niste član niti jednog projekta</td></tr>';
        }
      } catch (err) {
        console.error(err);
        projectsTableBody.innerHTML = '<tr><td colspan="8">Greška pri dohvaćanju projekata</td></tr>';
      }
    }
    
    // Dodavanje polja za obavljeni posao
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
    
    // Spremanje obavljenih poslova
    btnSpremiPoslove.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const obavljeniPoslovi = Array.from(document.querySelectorAll('.obavljeni-posao'))
        .map(input => input.value)
        .filter(v => v);
      
      try {
        const res = await fetch(`/api/projects/member/${editingProjectId}/poslovi`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ obavljeniPoslovi })
        });
        
        const data = await res.json();
        if (data.success) {
          alert('Obavljeni poslovi uspješno ažurirani!');
          bsObavljeniModal.hide();
          fetchProjects();
        } else {
          alert(data.message || 'Greška pri spremanju.');
        }
      } catch (err) {
        console.error(err);
        alert('Greška pri spremanju.');
      }
    });
    
    // Event delegation za gumbe
    projectsTableBody.addEventListener('click', async (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      
      const id = target.dataset.id;
      if (!id) return;
      
      // Uredi poslove
      if (target.classList.contains('btn-edit-poslovi')) {
        try {
          const res = await fetch(`/api/projects/${id}`);
          const data = await res.json();
          if (data.success) {
            const project = data.data;
            
            document.getElementById('projektNaziv').value = project.naziv;
            populateObavljeniPoslovi(project.obavljeniPoslovi);
            
            editingProjectId = project._id;
            bsObavljeniModal.show();
          }
        } catch (err) {
          console.error(err);
        }
      }
      
      // Detalji
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
              <p><strong>Voditelj:</strong> ${project.owner ? project.owner.username : 'N/A'}</p>
            `;
            bsDetailsModal.show();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
    
    function populateObavljeniPoslovi(poslovi) {
      obavljeniPosloviContainer.innerHTML = '';
      if (!poslovi || poslovi.length === 0) {
        obavljeniPosloviContainer.innerHTML = `
          <div class="input-group mb-2">
            <input type="text" class="form-control obavljeni-posao" placeholder="Npr. Dizajn">
          </div>
        `;
        return;
      }
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
    
    fetchProjects();
  });