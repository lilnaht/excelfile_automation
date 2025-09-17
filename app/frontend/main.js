const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const { fork } = require("child_process");

let mainWindow = null;

// --- INÍCIO DA CORREÇÃO: Captura de Erro Aprimorada ---
function runUpdateScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`Executando script com fork: ${path.basename(scriptPath)}`);

    const child = fork(scriptPath, [], { silent: true });
    let errorOutput = ''; // Variável para acumular as mensagens de erro

    child.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });

    // Captura e acumula qualquer saída de erro do script
    child.stderr.on('data', (data) => {
      const message = data.toString().trim();
      console.error(message);
      errorOutput += message + '\n';
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve(); // Sucesso
      } else {
        // Rejeita a Promise com a mensagem de erro detalhada que capturamos
        const detailedError = errorOutput || `O script terminou com o código de erro: ${code}`;
        reject(new Error(detailedError));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Falha ao iniciar o processo do script: ${err.message}`));
    });
  });
}
// --- FIM DA CORREÇÃO ---

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
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

  const initializeBackend = async () => {
    try {
      console.log('--- INICIANDO ATUALIZAÇÃO DO BANCO DE DADOS ---');
      const updateScriptPath = app.isPackaged
        ? path.join(process.resourcesPath, "backend", "updateDatabase.js")
        : path.join(__dirname, "..", "backend", "updateDatabase.js");
      
      await runUpdateScript(updateScriptPath);
      console.log('--- ATUALIZAÇÃO DO BANCO DE DADOS CONCLUÍDA ---');

      mainWindow.webContents.send('update-complete');

      console.log('\n--- INICIANDO SERVIDOR BACKEND ---');
      const backendPath = app.isPackaged
        ? path.join(process.resourcesPath, "backend", "server.js")
        : path.join(__dirname, "..", "backend", "server.js");
      const { startServer } = require(backendPath);
      startServer();

    } catch (error) {
      console.error('--- FALHA CRÍTICA NA INICIALIZAÇÃO ---', error);
      mainWindow.webContents.send('update-failed', error.message);
    }
  };

  initializeBackend();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});