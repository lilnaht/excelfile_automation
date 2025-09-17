const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configurações de caminhos
const BASE_DIR = __dirname;
const BASE_FILE = path.join(BASE_DIR, 'data', 'Excel_base', 'base.xlsx');
const BASE_SHEET_NAME = 'Custo';
const GENERATED_DIR = path.join(BASE_DIR, '..', '..', 'generated');

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

// --- CORREÇÃO 1: Usar a chave de serviço (service_role) para o backend ---
const SUPABASE_URL = 'https://vrpudltnycggaxewzgsl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycHVkbHRueWNnZ2F4ZXd6Z3NsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxOTM0NCwiZXhwIjoyMDczNTk1MzQ0fQ.Fyz5ZHXGImFVrnENUVxxIYZ7LMU3nDycS71_PAd9Jsg'; // <-- COLE SUA CHAVE 'service_role' AQUI
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mapeamento
const DEST_MAP = {
  'Immobilized': 'Imobilizado', 'Resale': 'Revenda', 'Production': 'Produção',
  'Supplies': 'Insumo', 'SKF': 'China', 'Dólar': 'USD', 'Euro': 'EUR'
};

// Função auxiliar para formatar datas (versão aprimorada)
function formatDate(dt) {
  if (!dt) return null;

  // VERIFICA SE É UM NÚMERO DE SÉRIE DO EXCEL
  // A maioria dos números de série de datas recentes são maiores que 25569 (o número para 1970)
  if (typeof dt === 'number' && dt > 25569) {
    // Fórmula matemática para converter o número de série do Excel para uma data JavaScript
    const date = new Date((dt - 25569) * 86400 * 1000);

    // Formata a data manualmente para o formato YYYY-MM-DD para evitar problemas de fuso horário
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // Se não for um número de série, tenta processar como uma data de texto normal (como antes)
  try {
    const date = new Date(dt);
    if (isNaN(date.getTime())) return null; // Retorna nulo se a data for inválida

    // A correção de fuso horário pode ser necessária para datas de texto
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);

    return correctedDate.toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
}

// Função para consultar cotação do dólar
async function getDollarQuote(dateInput = null) {
  const now = dateInput ? new Date(dateInput) : new Date();
  const maxDaysBack = 10;

  for (let i = 0; i < maxDaysBack; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() - i);
    const dateForApi = `${checkDate.getMonth() + 1}-${checkDate.getDate()}-${checkDate.getFullYear()}`;
    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dateForApi}'&$top=1&$format=json`;

    try {
      const response = await axios.get(url);
      if (response.data.value && response.data.value.length > 0) {
        return {
          fxValue: response.data.value[0].cotacaoCompra,
          fxDate: new Date(response.data.value[0].dataHoraCotacao)
        };
      }
    } catch (error) {
      continue;
    }
  }
  return { fxValue: null, fxDate: null };
}

// Função auxiliar para determinar a próxima revisão
function getNextRevision(processDir, baseFileName) {
  // Lista todos os arquivos no diretório do processo
  if (!fs.existsSync(processDir)) {
    return 'Rev1.0';
  }

  const files = fs.readdirSync(processDir);
  const basePattern = baseFileName.replace('- Rev1.0.xlsx', '');

  // Encontra arquivos com o mesmo nome base e extrai as revisões
  const revisions = [];
  files.forEach(file => {
    if (file.startsWith(basePattern) && file.endsWith('.xlsx')) {
      const match = file.match(/- Rev(\d+)\.(\d+)\.xlsx$/);
      if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        revisions.push({ major, minor, file });
      }
    }
  });

  if (revisions.length === 0) {
    return 'Rev1.0';
  }

  // Encontra a maior revisão
  const latestRevision = revisions.reduce((max, current) => {
    if (current.major > max.major || (current.major === max.major && current.minor > max.minor)) {
      return current;
    }
    return max;
  });

  // Incrementa a revisão menor
  const newMinor = latestRevision.minor + 1;
  return `Rev${latestRevision.major}.${newMinor}`;
}

async function generateFile(processInput) {
  try {
    const { data: processItems, error } = await supabase
      .from('processos')
      .select('*')
      .eq('Process', processInput.toUpperCase());

    if (error) throw new Error(`Erro ao consultar Supabase: ${error.message}`);
    if (!processItems || processItems.length === 0) return { success: false, message: `Nenhum registro encontrado para o processo ${processInput}` };

    const headerData = processItems[0];
    const now = new Date();
    const processIdVal = headerData.Process || 'PROCESSO';
    const dateIdVal = now.toISOString().split('T')[0];
    const invoiceIdVal = headerData.Invoice || 'INVOICE';
    const safeInvoice = invoiceIdVal.toString().replace(/[\/\s]/g, '_');

    const processDir = path.join(GENERATED_DIR, processIdVal);
    if (!fs.existsSync(processDir)) fs.mkdirSync(processDir, { recursive: true });

    // Cria o nome base do arquivo (sem revisão)
    const baseFileName = `${processIdVal} - ${dateIdVal} - Cost Forecast - ${safeInvoice} - Rev1.0.xlsx`;

    // Determina a próxima revisão
    const nextRevision = getNextRevision(processDir, baseFileName);

    // Cria o nome final do arquivo com a revisão correta
    const fileName = baseFileName.replace('Rev1.0', nextRevision);

    const copyFile = path.join(processDir, fileName);
    fs.copyFileSync(BASE_FILE, copyFile);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(copyFile);
    const ws = workbook.getWorksheet(BASE_SHEET_NAME);

    if (!ws) throw new Error('Planilha base "Custo" não encontrada no template');

    // Preencher cabeçalho
    const { fxValue, fxDate } = await getDollarQuote();
    ws.getCell('D7').value = now;
    ws.getCell('D8').value = headerData.Process;
    ws.getCell('D9').value = headerData.Invoice;
    ws.getCell('D10').value = DEST_MAP[headerData.Supplier] || headerData.Supplier;
    ws.getCell('D11').value = headerData.Incoterm;
    ws.getCell('D12').value = headerData.Modal;
    ws.getCell('D13').value = DEST_MAP[headerData.Destination] || headerData.Destination;
    ws.getCell('D14').value = DEST_MAP[headerData.Currency] || headerData.Currency;
    ws.getCell('D15').value = headerData.Requester;
    ws.getCell('D16').value = headerData['Forwarding Agent'];
    ws.getCell('B19').value = headerData.Description;

    const cellDisponibilidade = ws.getCell('H7');
    cellDisponibilidade.value = Number(headerData['Requested Time of Availability']);
    cellDisponibilidade.numFmt = 'dd/mm/yyyy'; // Formato de data brasileiro

    //const cellEmbarque = ws.getCell('H8');
    //cellEmbarque.value = Number(headerData['Shipment Date']);
    //cellEmbarque.numFmt = 'dd/mm/yyyy';

    //const cellAtracacao = ws.getCell('H9');
    //cellAtracacao.value = Number(headerData['Arrival Date']);
    //cellAtracacao.numFmt = 'dd/mm/yyyy';

    //const cellChegada = ws.getCell('H10');
    //cellChegada.value = Number(headerData['Delivery Date']);
    //cellChegada.numFmt = 'dd/mm/yyyy';
    
    ws.getCell('G13').value = fxValue ? Number(fxValue) : 'Checar API';
    ws.getCell('G13').numFmt = '#,##0.0000';
    ws.getCell('H13').value = fxDate;

    // --- CORREÇÃO 2: Preencher tabela de itens com FORMATAÇÃO BRASILEIRA ---
    let startRow = 25;
    processItems.forEach(item => {
      const row = ws.getRow(startRow);
      row.getCell('C').value = item['Product Code'];
      row.getCell('D').value = item.Description;
      row.getCell('F').value = item.Derivation;

      const cellQuantidade = row.getCell('G');
      cellQuantidade.value = Number(item['Quantity Real']);
      cellQuantidade.numFmt = '#,##0';

      const cellValorUnitario = row.getCell('H');
      cellValorUnitario.value = Number(item.Price);
      cellValorUnitario.numFmt = '#,##0.00';

      const cellPesoLiquido = row.getCell('L');
      cellPesoLiquido.value = Number(item['Net Weight']);
      cellPesoLiquido.numFmt = '#,##0.00';

      row.getCell('N').value = item.NCM;

      const formatPercent = (value) => value ? Number(value) / 100 : 0;

      row.getCell('O').value = formatPercent(item['II Value']);
      row.getCell('O').numFmt = '0.00%';
      row.getCell('P').value = formatPercent(item['PIS Value']);
      row.getCell('P').numFmt = '0.00%';
      row.getCell('Q').value = formatPercent(item['COFINS Value']);
      row.getCell('Q').numFmt = '0.00%';
      row.getCell('R').value = formatPercent(item['IPI Value']);
      row.getCell('R').numFmt = '0.00%';

      startRow++;
    });

    await workbook.xlsx.writeFile(copyFile);

    return { success: true, message: 'Arquivo gerado ✅', fileName };
  } catch (error) {
    console.error('Erro ao gerar arquivo:', error);
    return { success: false, message: `Erro interno: ${error.message}` };
  }
}

// Endpoints
app.get('/status', async (req, res) => {
  try {
    const { error } = await supabase.from('processos').select('id').limit(1);
    if (error) {
      return res.status(500).json({ status: 'disconnected', message: 'Erro na conexão com o banco de dados' });
    }
    res.json({ status: 'connected', message: 'Conectado ao banco de dados' });
  } catch (error) {
    res.status(500).json({ status: 'disconnected', message: 'Erro interno' });
  }
});

app.post('/generate-file', async (req, res) => {
  const { process_input } = req.body;

  if (!process_input) {
    return res.status(400).json({ error: 'process_input is required' });
  }

  try {
    const result = await generateFile(process_input);

    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }

    res.json({ message: result.message, file_name: result.fileName });
  } catch (error) {
    console.error('Erro no endpoint /generate-file:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/download-file/:fileName', (req, res) => {
  const { fileName } = req.params;

  // Find the file in the generated directory
  const findFile = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        const found = findFile(filePath);
        if (found) return found;
      } else if (file === fileName) {
        return filePath;
      }
    }
    return null;
  };

  const filePath = findFile(GENERATED_DIR);

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error('Erro ao fazer download do arquivo:', err);
      res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
    }
  });
});

// --- CORREÇÃO 3: Função startServer com teste de conexão ---
function startServer() {
  app.listen(PORT, async () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
    console.log('Testando conexão com o Supabase...');
    try {
      const { error } = await supabase.from('processos').select('id').limit(1);
      if (error) {
        console.error('--- ❌ FALHA NA CONEXÃO COM SUPABASE ---');
        console.error(`Detalhes: ${error.message}`);
      } else {
        console.log('✅ Conectado ao Supabase com sucesso.');
      }
    } catch (err) {
      console.error('Ocorreu um erro inesperado ao testar a conexão:', err);
    }
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };