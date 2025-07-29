/* ======== Malla IDED — lógica de pre-requisitos ======== */
/* Funciona así:
   - Cada .ramo declara data-id y (opcional) data-unlocks con ids separados por comas.
   - A partir de data-unlocks se construye el mapa "prereqs" para cada ramo destino.
   - Un ramo queda bloqueado si tiene ≥1 prereq no aprobado.
   - Al hacer clic en un ramo UNLOCKED se alterna Aprobado / No aprobado y se propagan cambios.
   - Se guarda el estado en localStorage.
*/

(function(){
  const $ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const byId = id => document.querySelector(`[data-id="${id}"]`);

  const STORAGE_KEY = "mallaIDED:v1";

  const ramos = $('.ramo');
  // Construir grafo unlocks -> prereqs
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

  // Estado
  let aprobado = new Set();

  // Cargar estado si existe
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.aprobado)) aprobado = new Set(data.aprobado);
    }
  }catch(e){ console.warn("No se pudo leer estado:", e); }

  // Determinar estado inicial (locked/unlocked/aprobado)
  function aplicarEstadoVisual(){
    ramos.forEach(btn=>{
      const id = btn.dataset.id;
      btn.classList.remove('locked','unlocked','aprobado');

      if (aprobado.has(id)) {
        btn.classList.add('aprobado');
        return;
      }
      const reqs = prereqsMap[id];
      if (reqs && ![...reqs].every(r => aprobado.has(r))) {
        btn.classList.add('locked');
      } else {
        btn.classList.add('unlocked');
      }
    });
  }

  function guardar(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      aprobado: [...aprobado]
    }));
  }

  // Click handler
  function onClickRamo(e){
    const btn = e.currentTarget;
    const id = btn.dataset.id;

    // Si está bloqueado, aviso
    if (btn.classList.contains('locked')) {
      const reqs = [...(prereqsMap[id]||[])].map(r=> byId(r)?.textContent.trim() || r);
      avisar(`Para cursar “${btn.textContent.trim()}” primero aprueba: ${reqs.join(", ")}`);
      return;
    }

    // Alternar aprobado
    if (aprobado.has(id)) {
      aprobado.delete(id);
    } else {
      aprobado.add(id);
    }
    guardar();
    aplicarEstadoVisual();
  }

  // Utilidad: Aviso flotante
  let tip;
  function avisar(msg){
    if (!tip){
      tip = document.createElement('div');
      tip.className = 'tooltip';
      document.body.appendChild(tip);
    }
    tip.textContent = msg;
    tip.classList.add('show');
    clearTimeout(tip._t);
    tip._t = setTimeout(()=> tip.classList.remove('show'), 2200);
  }

  // Controles
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

  // Listeners de ramos
  ramos.forEach(btn => btn.addEventListener('click', onClickRamo));

  // Render inicial
  aplicarEstadoVisual();
})();
