const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Escuta a mensagem de 'atualização concluída' do main.js
  onUpdateComplete: (callback) => ipcRenderer.on('update-complete', callback),
  // Escuta a mensagem de 'falha na atualização' do main.js
  onUpdateFailed: (callback) => ipcRenderer.on('update-failed', callback),
  // Envia solicitação para rodar atualização on-demand
  sendUpdateRequest: () => ipcRenderer.invoke('run-update')
});
