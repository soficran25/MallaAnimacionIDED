// Script para la funcionalidad interactiva
document.addEventListener('DOMContentLoaded', function() {
    const ramos = document.querySelectorAll('.ramo');

    ramos.forEach(ramo => {
        ramo.addEventListener('click', function() {
            ramo.classList.toggle('aprobado');
            const requisito = ramo.dataset.requisito;
            if (requisito) {
                const ramoRequisito = document.getElementById(requisito);
                if (ramoRequisito) {
                    ramoRequisito.classList.add('aprobado');
                }
            }
        });
    });
});

