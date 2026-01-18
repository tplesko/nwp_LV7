document.addEventListener('DOMContentLoaded', () => {
    const projectsTableBody = document.getElementById('projectsTableBody');
    const detailsModalEl = document.getElementById('detailsModal');
    const detailsContent = document.getElementById('detailsContent');
    const filterTip = document.getElementById('filterTip');
    const filterStatus = document.getElementById('filterStatus');
    
    const bsDetailsModal = new bootstrap.Modal(detailsModalEl);
    
    btnZatvoriDetalji.addEventListener('click', () => {
      bsDetailsModal.hide();
    });
    
    let allProjects = [];
    
    // Dohvati arhivirane projekte
    async function fetchProjects() {
      projectsTableBody.innerHTML = '<tr><td colspan="7">Učitavanje...</td></tr>';
      try {
        const res = await fetch('/api/projects/archived/all');
        const data = await res.json();
        
        if (data.success) {
          allProjects = data.data;
          renderProjects();
        } else {
          projectsTableBody.innerHTML = '<tr><td colspan="7">Nema arhiviranih projekata</td></tr>';
        }
      } catch (err) {
        console.error(err);
        projectsTableBody.innerHTML = '<tr><td colspan="7">Greška pri dohvaćanju projekata</td></tr>';
      }
    }
    
    function renderProjects() {
      let filtered = [...allProjects];
      
      // Filter po tipu
      if (filterTip.value) {
        filtered = filtered.filter(p => p.userRole === filterTip.value);
      }
      
      // Filter po statusu
      if (filterStatus.value) {
        filtered = filtered.filter(p => p.status === filterStatus.value);
      }
      
      projectsTableBody.innerHTML = '';
      
      if (filtered.length === 0) {
        projectsTableBody.innerHTML = '<tr><td colspan="7">Nema projekata koji odgovaraju filteru</td></tr>';
        return;
      }
      
      filtered.forEach(project => {
        const tr = document.createElement('tr');
        
        const statusClass = {
          'planiran': 'bg-secondary',
          'u_tijeku': 'bg-primary',
          'zavrsen': 'bg-success',
          'otkazan': 'bg-danger'
        }[project.status] || 'bg-secondary';
        
        const ulogaBadge = project.userRole === 'owner' 
          ? '<span class="badge bg-primary">Voditelj</span>'
          : '<span class="badge bg-info">Član</span>';
        
        tr.innerHTML = `
          <td>${project.naziv}</td>
          <td>${project.opis.substring(0, 50)}${project.opis.length > 50 ? '...' : ''}</td>
          <td><span class="badge ${statusClass}">${project.status}</span></td>
          <td>${project.datumPocetka ? new Date(project.datumPocetka).toLocaleDateString('hr-HR') : ''}</td>
          <td>${project.datumZavrsetka ? new Date(project.datumZavrsetka).toLocaleDateString('hr-HR') : '-'}</td>
          <td>${ulogaBadge}</td>
          <td>
            <button class="btn btn-sm btn-info btn-details" data-id="${project._id}">
              <i class="fas fa-eye"></i> Detalji
            </button>
          </td>
        `;
        projectsTableBody.appendChild(tr);
      });
    }
    
    // Event delegation za detalje
    projectsTableBody.addEventListener('click', async (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      
      const id = target.dataset.id;
      if (!id) return;
      
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
              <p><strong>Arhiviran:</strong> DA</p>
            `;
            bsDetailsModal.show();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
    
    // Filteri
    filterTip.addEventListener('change', renderProjects);
    filterStatus.addEventListener('change', renderProjects);
    
    fetchProjects();
  });