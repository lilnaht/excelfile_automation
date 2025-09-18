const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const { fork } = require("child_process");

let mainWindow = null;

// --- INÍCIO DA CORREÇÃO: Captura de Erro Aprimorada ---
function runUpdateScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`[INFO] Executando script com fork: ${path.basename(scriptPath)}`);

    const child = fork(scriptPath, [], { silent: true });
    let errorOutput = ''; // Variável para acumular as mensagens de erro

    child.stdout.on('data', (data) => {
      console.log(`[STDOUT] ${data.toString().trim()}`);
    });

    // Captura e acumula qualquer saída de erro do script
    child.stderr.on('data', (data) => {
      const message = data.toString().trim();
      console.error(`[STDERR] ${message}`);
      errorOutput += message + '\n';
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('[SUCCESS] Script finalizado com sucesso.');
        resolve(); // Sucesso
      } else {
        // Rejeita a Promise com a mensagem de erro detalhada que capturamos
        const detailedError = errorOutput || `O script terminou com o código de erro: ${code}`;
        console.error(`[ERROR] Script finalizado com erro: ${detailedError}`);
        reject(new Error(detailedError));
      }
    });

    child.on('error', (err) => {
      console.error(`[ERROR] Falha ao iniciar o processo do script: ${err.message}`);
      reject(new Error(`Falha ao iniciar o processo do script: ${err.message}`));
    });
  });
}
// --- FIM DA CORREÇÃO ---

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, 'icon/icon.ico') 
  });
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  Menu.setApplicationMenu(null);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Lógica principal de inicialização
app.whenReady().then(() => {
  createWindow();

  // Iniciar servidor backend diretamente
  console.log('\n--- INICIANDO SERVIDOR BACKEND ---');
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, "backend", "server.js")
    : path.join(__dirname, "..", "backend", "server.js");
  const { startServer } = require(backendPath);
  startServer();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Handler IPC para atualização on-demand
ipcMain.handle('run-update', async () => {
  try {
    console.log('[UPDATE] Iniciando atualização do banco de dados...');
    const updateScriptPath = app.isPackaged
      ? path.join(process.resourcesPath, "backend", "updateDatabase.js")
      : path.join(__dirname, "..", "backend", "updateDatabase.js");

    await runUpdateScript(updateScriptPath);
    console.log('[SUCCESS] Atualização do banco de dados concluída com sucesso.');

    if (mainWindow) {
      mainWindow.webContents.send('update-complete');
    }
  } catch (error) {
    console.error('[ERROR] Falha na atualização do banco de dados:', error.message);
    if (mainWindow) {
      mainWindow.webContents.send('update-failed', error.message);
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});