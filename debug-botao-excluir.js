// Adicionar este código temporariamente para debug
// Copie e cole no console do navegador na página "Consultar Notas"

console.log('=== DEBUG BOTÃO EXCLUIR NOTAS ===');

// 1. Verificar se há notas na página
const notasRows = document.querySelectorAll('tbody tr');
console.log(`Linhas de notas encontradas: ${notasRows.length}`);

// 2. Verificar botões de delete
const deleteButtons = document.querySelectorAll('button');
const deleteButtonsArray = Array.from(deleteButtons).filter(btn => {
  return btn.innerHTML.includes('Delete') || 
         btn.getAttribute('aria-label')?.includes('Delete') ||
         btn.querySelector('svg[data-testid="DeleteIcon"]');
});

console.log(`Botões de delete encontrados: ${deleteButtonsArray.length}`);

// 3. Verificar detalhes de cada botão
deleteButtonsArray.forEach((btn, index) => {
  console.log(`Botão ${index + 1}:`, {
    disabled: btn.disabled,
    visible: btn.offsetParent !== null,
    innerHTML: btn.innerHTML.substring(0, 50),
    ariaLabel: btn.getAttribute('aria-label'),
    class: btn.className
  });
});

// 4. Verificar notas específicas
const notasNaoVinculadas = ['94503', '93692']; // IDs das notas não vinculadas
notasRows.forEach((row, index) => {
  const cells = row.querySelectorAll('td');
  if (cells.length > 0) {
    const numeroNota = cells[0].textContent.trim();
    const isNotaTeste = notasNaoVinculadas.includes(numeroNota);
    const deleteBtn = row.querySelector('button[aria-label*="Delete"], button svg[data-testid="DeleteIcon"]');
    
    console.log(`Linha ${index + 1} - Nota: ${numeroNota}`, {
      isNotaTeste,
      hasDeleteButton: !!deleteBtn,
      deleteButtonDisabled: deleteBtn?.disabled,
      deleteButtonVisible: deleteBtn?.offsetParent !== null
    });
  }
});

// 5. Forçar visibilidade dos botões (debug)
console.log('Forçando visibilidade dos botões...');
deleteButtonsArray.forEach(btn => {
  if (btn.disabled) {
    console.log('Botão desabilitado encontrado, removendo disabled...');
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  }
});

console.log('=== FIM DO DEBUG ===');
