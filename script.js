/* ======== Malla IDED — lógica de prerrequisitos ======== */
/* Funcionamiento:
   - Cada .ramo declara data-id y (opcional) data-unlocks (ids separados por coma).
   - Se arma el mapa de prerrequisitos por ramo destino.
   - Un ramo está BLOQUEADO si tiene ≥1 prerrequisito no aprobado.
   - Al hacer clic en un ramo desbloqueado se alterna Aprobado/No aprobado y se propaga.
   - Estado se guarda en localStorage (progreso por navegador).
*/

(function(){
  const $ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const byId = id => document.querySelector(`[data-id="${id}"]`);

  const STORAGE_KEY = "mallaIDED:v1";

  const ramos = $('.ramo');

  /* ---- Construir grafo: unlocks -> prereqs ---- */
  const unlocksMap = {};   // id -> Set(destinos)
  const prereqsMap = {};   // idDestino -> Set(requisitos)

  ramos.forEach(btn=>{
    const id = btn.dataset.id;
    const unlocks = (btn.dataset.unlocks||"")
      .split(",").map(s=>s.trim()).filter(Boolean);
    if (!unlocksMap[id]) unlocksMap[id] = new Set();
    unlocks.forEach(dst=>{
      unlocksMap[id].add(dst);
      if (!prereqsMap[dst]) prereqsMap[dst] = new Set();
      prereqsMap[dst].add(id);
    });
  });

  /* ---- Estado ---- */
  let aprobado = new Set();

  // Cargar de localStorage
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.aprobado)) aprobado = new Set(data.aprobado);
    }
  }catch(e){ console.warn("No se pudo leer estado:", e); }

  function guardar(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ aprobado: [...aprobado] }));
  }

  /* ---- Render visual según estado ---- */
  function aplicarEstadoVisual(){
    ramos.forEach(btn=>{
      const id = btn.dataset.id;
      btn.classList.remove('locked','unlocked','aprobado');
      btn.removeAttribute('title');

      if (aprobado.has(id)) {
        btn.classList.add('aprobado');
        btn.disabled = false;
        btn.setAttribute('aria-pressed','true');
        return;
      }

      const reqs = prereqsMap[id];
      if (reqs && ![...reqs].every(r => aprobado.has(r))) {
        // Faltan requisitos -> bloqueado
        btn.classList.add('locked');
        btn.disabled = true;
        btn.setAttribute('aria-pressed','false');

        const faltan = [...reqs].filter(r => !aprobado.has(r))
          .map(r => byId(r)?.textContent.trim() || r);
        if (faltan.length) btn.title = `Bloqueado. Primero aprueba: ${faltan.join(', ')}`;
      } else {
        // Sin requisitos pendientes -> se puede cursar
        btn.classList.add('unlocked');
        btn.disabled = false;
        btn.setAttribute('aria-pressed','false');
      }
    });
  }

  /* ---- Interacción ---- */
  function onClickRamo(e){
    const btn = e.currentTarget;
    const id = btn.dataset.id;

    if (btn.disabled) return; // bloqueado: no hace nada

    // Alternar aprobado
    if (aprobado.has(id)) {
      aprobado.delete(id);
    } else {
      aprobado.add(id);
    }
    guardar();
    aplicarEstadoVisual();
  }

  // Botones de control
  document.getElementById('btnReset').addEventListener('click', ()=>{
    if (confirm("¿Borrar todo tu progreso?")) {
      aprobado.clear();
      guardar();
      aplicarEstadoVisual();
    }
  });

  document.getElementById('btnExport').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify({aprobado:[...aprobado]}, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'progreso-malla-idED.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Botón Importar abre el selector de archivo
  document.getElementById('btnImport').addEventListener('click', ()=>{
    document.getElementById('importFile').click();
  });

  // Lectura del archivo importado
  document.getElementById('importFile').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>{
      try{
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.aprobado)) {
          aprobado = new Set(data.aprobado);
          guardar();
          aplicarEstadoVisual();
        } else {
          alert("Archivo inválido.");
        }
      }catch(err){ alert("No se pudo leer el archivo."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // Listeners por cada ramo
  ramos.forEach(btn => btn.addEventListener('click', onClickRamo));

  // Render inicial
  aplicarEstadoVisual();
})();
