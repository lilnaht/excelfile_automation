const loadingOverlay = document.querySelector('#loadingOverlay');
const loadingText = document.querySelector('#loadingText');
const lastUpdatetxt = document.querySelector('#lastUpdatetxt');
const lastUpdateContainer = document.querySelector('#lastUpdateContainer');
const updateBtn = document.querySelector('#updateBtn');

// Esconde o loading overlay imediatamente no load, pois não há atualização automática
document.addEventListener('DOMContentLoaded', () => {
  loadingOverlay.classList.add('hidden');
  fetchLastUpdate();
});

// Escuta o evento de sucesso vindo do main.js
window.electronAPI.onUpdateComplete(() => {
  console.log('[✅] Atualização do banco de dados concluída!');
  loadingText.textContent = 'Atualizacao concluida com sucesso!';
  showFeedback('Base de dados atualizada com sucesso!', 'success');

  // Reseta estado do botão
  isUpdating = false;
  updateBtn.classList.remove('processing');
  updateBtn.querySelector('.button-text').textContent = 'Atualizar Base';

  updateDbStatus('connected');

  // Esconde a tela de carregamento suavemente após um pequeno atraso
  setTimeout(() => {
    loadingOverlay.classList.add('hidden');
  }, 2000); // Atraso de 1 segundo

  // Atualiza a última atualização
  fetchLastUpdate();
});

// Escuta o evento de falha vindo do main.js
window.electronAPI.onUpdateFailed((_event, error) => {
  console.error('[❌] Falha na atualização:', error);
  loadingText.textContent = `Erro na atualização: ${error}`;
  showFeedback(`Erro na atualização: ${error}`, 'error');

  // Reseta estado do botão
  isUpdating = false;
  updateBtn.classList.remove('processing');
  updateBtn.querySelector('.button-text').textContent = 'Atualizar Base';

  updateDbStatus('disconnected');

  // Esconde a tela de carregamento
  setTimeout(() => {
    loadingOverlay.classList.add('hidden');
  }, 2000);
});


async function fetchLastUpdate() {
  try {
    const response = await fetch('http://127.0.0.1:5000/last-update');
    const data = await response.json();
    if (data.lastUpdate) {
      // Format date as MM/DD/YYYY, HH:mm:ss AM/PM
      const formattedDate = new Date(data.lastUpdate).toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      });
      if (lastUpdateContainer) {
        lastUpdateContainer.textContent = `Última atualização: ${formattedDate}`;
      } else {
        lastUpdatetxt.textContent = `Última atualização: ${formattedDate}`;
      }
    } else {
      if (lastUpdateContainer) {
        lastUpdateContainer.textContent = 'Última atualização: não encontrada';
      } else {
        lastUpdatetxt.textContent = 'Última atualização: não encontrada';
      }
    }
  } catch (err) {
    if (lastUpdateContainer) {
      lastUpdateContainer.textContent = 'Erro ao buscar última atualização';
    } else {
      lastUpdatetxt.textContent = 'Erro ao buscar última atualização';
    }
    console.error(err);
  }
}

// Chama ao carregar a página
document.addEventListener('DOMContentLoaded', fetchLastUpdate);

// Atualiza novamente quando a atualização do banco terminar
window.electronAPI.onUpdateComplete(() => {
  fetchLastUpdate();
});

const input = document.querySelector('#processInput');
const button = document.querySelector('#generateBtn');
const feedback = document.querySelector('#result');
const inputBorder = document.querySelector('.input-border');
const dbStatus = document.querySelector('#dbStatus');

let isProcessing = false;
let isUpdating = false;
let statusCheckInterval = null;

// Eventos de input
input.addEventListener('input', handleInputChange);
input.addEventListener('focus', handleInputFocus);
input.addEventListener('blur', handleInputBlur);

// Evento do botão
button.addEventListener('click', handleProcessClick);

// Evento do botão de atualização
updateBtn.addEventListener('click', handleUpdateClick);

// Ripple effect nos botões
button.addEventListener('mousedown', createRippleEffect);
updateBtn.addEventListener('mousedown', createRippleEffect);

function handleInputChange(e) {
  const value = e.target.value.trim();

  if (value.length > 0) {
    input.classList.add('has-content');
    button.classList.add('active');
  } else {
    input.classList.remove('has-content');
    button.classList.remove('active');
  }

  if (feedback.classList.contains('visible')) hideFeedback();
}

function handleInputFocus() {
  input.classList.add('focused');
}

function handleInputBlur() {
  input.classList.remove('focused');
}

function handleProcessClick() {
  if (isProcessing) return;

  const inputValue = input.value.trim();
  if (!inputValue) {
    showFeedback('Por favor, digite o processo.', 'error');
    input.focus();
    return;
  }

  processInput(inputValue);
}

function handleUpdateClick() {
  if (isUpdating) return;

  isUpdating = true;
  updateBtn.classList.add('processing');
  updateBtn.querySelector('.button-text').textContent = 'Atualizando...';

  loadingOverlay.classList.remove('hidden');
  loadingText.textContent = 'Atualizando base de dados...';

  updateDbStatus('connecting');

  electronAPI.sendUpdateRequest().catch(error => {
    console.error('Erro ao enviar solicitação de atualização:', error);
    showFeedback('Erro ao iniciar atualização.', 'error');
    loadingOverlay.classList.add('hidden');
    isUpdating = false;
    updateBtn.classList.remove('processing');
    updateBtn.querySelector('.button-text').textContent = 'Atualizar Base';
    updateDbStatus('disconnected');
  });
}

// Função de processamento com API real
async function processInput(value) {
  isProcessing = true;
  button.classList.add('processing');
  button.querySelector('.button-text').textContent = 'Processando...';

  showFeedback('Gerando arquivo...', 'info');

  try {
    const response = await fetch('http://127.0.0.1:5000/generate-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ process_input: value })
    });

    const data = await response.json();

    if (response.ok) {
      feedback.innerHTML = `
        ${data.message}
      `;
      feedback.className = 'feedback success visible';
    } else {
      showFeedback(`Erro: ${data.error}`, 'error');
    }

    // Limpa input após sucesso
    input.value = '';
    input.classList.remove('has-content');
    button.classList.remove('active');

  } catch (error) {
    showFeedback(`Erro de conexão: ${error}`, 'error');
  } finally {
    isProcessing = false;
    button.classList.remove('processing');
    button.querySelector('.button-text').textContent = 'Processar';
  }
}

function showFeedback(message, type) {
  feedback.textContent = message;
  feedback.className = `feedback ${type} visible`;
}

function hideFeedback() {
  feedback.classList.remove('visible');
  setTimeout(() => {
    feedback.className = 'feedback hidden';
  }, 300);
}

function createRippleEffect(e) {
  const ripple = e.currentTarget.querySelector('.button-ripple');
  const rect = e.currentTarget.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('animate');

  setTimeout(() => ripple.classList.remove('animate'), 600);
}

// Suporte para Enter
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !isProcessing) handleProcessClick();
});

// Funções de status do banco de dados
function updateDbStatus(status) {
  dbStatus.classList.remove('connected', 'disconnected', 'connecting');
  dbStatus.classList.add(status);
}

async function checkDatabaseStatus() {
  try {
    const response = await fetch('http://127.0.0.1:5000/status');
    const data = await response.json();

    if (data.status === 'connected') {
      updateDbStatus('connected');
    } else {
      updateDbStatus('disconnected');
    }
  } catch (error) {
    updateDbStatus('disconnected');
  }
}

function startStatusChecking() {
  // Verifica status imediatamente
  checkDatabaseStatus();

  // Verifica a cada 30 segundos
  statusCheckInterval = setInterval(checkDatabaseStatus, 30000);
}

function stopStatusChecking() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
    statusCheckInterval = null;
  }
}

// Inicia verificação de status quando a página carrega
document.addEventListener('DOMContentLoaded', startStatusChecking);

// Para verificação quando a janela é fechada
window.addEventListener('beforeunload', stopStatusChecking);
