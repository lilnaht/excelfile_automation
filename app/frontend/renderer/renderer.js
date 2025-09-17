// No início de renderer.js

const loadingOverlay = document.querySelector('#loadingOverlay');
const loadingText = document.querySelector('#loadingText');

// Escuta o evento de sucesso vindo do main.js
window.electronAPI.onUpdateComplete(() => {
  console.log('Atualização do banco de dados concluída!');
  loadingText.textContent = 'Atualização concluída com sucesso!';

  // Esconde a tela de carregamento suavemente após um pequeno atraso
  setTimeout(() => {
    loadingOverlay.classList.add('hidden');
  }, 1000); // Atraso de 1 segundo
});

// Escuta o evento de falha vindo do main.js
window.electronAPI.onUpdateFailed((_event, error) => {
  console.error('Falha na atualização:', error);
  // Muda o texto para mostrar o erro e não esconde a tela
  loadingText.textContent = `Erro na atualização: ${error}`;
  // Você pode adicionar um botão de "Tentar novamente" ou "Fechar" aqui, se desejar.
});

// ... resto do seu código renderer.js ...
const input = document.querySelector('#processInput');
const button = document.querySelector('#generateBtn');
const feedback = document.querySelector('#result');
const inputBorder = document.querySelector('.input-border');
const dbStatus = document.querySelector('#dbStatus');

let isProcessing = false;
let statusCheckInterval = null;

// Eventos de input
input.addEventListener('input', handleInputChange);
input.addEventListener('focus', handleInputFocus);
input.addEventListener('blur', handleInputBlur);

// Evento do botão
button.addEventListener('click', handleProcessClick);

// Ripple effect no botão
button.addEventListener('mousedown', createRippleEffect);

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
async function checkDatabaseStatus() {
  try {
    const response = await fetch('http://127.0.0.1:5000/status');
    const data = await response.json();

    if (data.status === 'connected') {
      dbStatus.className = 'db-status connected';
    } else {
      dbStatus.className = 'db-status disconnected';
    }
  } catch (error) {
    dbStatus.className = 'db-status disconnected';
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
