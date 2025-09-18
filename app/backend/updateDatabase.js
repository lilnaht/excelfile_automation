const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const fs = require('fs');
const ExcelJS = require('exceljs');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURAÇÕES ---
const CLEAN_DATA_PATH = path.join(__dirname, 'data', 'cleaned_data.xlsx');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TABLE_NAME = 'processos';
// ---------------------

// --- SUPABASE CLIENT ---
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Erro: Variáveis de ambiente Supabase não encontradas. Verifique o arquivo .env.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
// -----------------------

// --- FUNÇÃO PRINCIPAL ---
async function updateDatabase() {
  if (!fs.existsSync(CLEAN_DATA_PATH)) {
    throw new Error(`Arquivo de dados não encontrado: ${CLEAN_DATA_PATH}`);
  }

  console.log('Iniciando atualização do Supabase com dados limpos...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(CLEAN_DATA_PATH);
  const worksheet = workbook.worksheets[0];
  const headers = worksheet.getRow(1).values.filter(h => h);

  const dataToInsert = [];
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const rowValues = worksheet.getRow(i).values;
    let rowData = {};
    headers.forEach((header, index) => {
      rowData[header] = rowValues[index + 1];
    });
    if (Object.keys(rowData).length > 0 && rowData['Process&Item']) {
      dataToInsert.push(rowData);
    }
  }
  console.log(`${dataToInsert.length} registros lidos do arquivo limpo.`);

  if (dataToInsert.length > 0) {
    console.log(`Etapa A: Apagando todos os dados antigos da tabela "${TABLE_NAME}"...`);
    const { error: deleteError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) throw deleteError;
    console.log('Dados antigos apagados com sucesso.');

    console.log(`Etapa B: Inserindo ${dataToInsert.length} novos registros...`);
    const { error: insertError } = await supabase.from(TABLE_NAME).insert(dataToInsert);
    if (insertError) throw insertError;

    console.log('✅ Base de dados atualizada com sucesso no Supabase!');
  } else {
    console.log('Nenhum dado para atualizar.');
  }
}
// -----------------------

updateDatabase().finally(() => {
  console.log('Script de atualização finalizado.');
  process.exit(0);
});
