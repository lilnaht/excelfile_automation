// updateDatabase.js (Versão Simplificada para Produção)

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const fs = require('fs');
const ExcelJS = require('exceljs');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURAÇÕES ---
// O caminho agora aponta para o arquivo de dados limpos dentro da pasta do projeto
const CLEAN_DATA_PATH = path.join(__dirname, 'data', 'cleaned_data.xlsx');
const TAXFARE_DATA_PATH = path.join(__dirname, 'data', 'taxFare.xlsx');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TABLE_NAME = 'processos';
const TAXFARE_TABLE_NAME = 'taxfare';
const UPDATES_TABLE = 'updates'

// Validação das chaves
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Erro: Variáveis de ambiente Supabase não encontradas. Verifique o arquivo .env.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- FUNÇÃO PARA ATUALIZAR TAXFARE ---
async function updateTaxFare() {
    // Verifica se o arquivo de taxFare existe
    if (!fs.existsSync(TAXFARE_DATA_PATH)) {
        console.log(`Arquivo de taxFare não encontrado: ${TAXFARE_DATA_PATH}. Pulando atualização de taxFare.`);
        return;
    }

    console.log('Iniciando atualização do Supabase com dados de taxFare...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TAXFARE_DATA_PATH);
    const worksheet = workbook.worksheets[0];
    const headers = worksheet.getRow(1).values.filter(h => h);

    const dataToInsert = [];
    for (let i = 2; i <= worksheet.rowCount; i++) {
        const rowValues = worksheet.getRow(i).values;
        let rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = rowValues[index + 1];
        });
        if (Object.keys(rowData).length > 0) {
            dataToInsert.push(rowData);
        }
    }
    console.log(`${dataToInsert.length} registros lidos do arquivo taxFare.`);

    if (dataToInsert.length > 0) {
      try {
        console.log(`Etapa A (TaxFare): Apagando todos os dados antigos da tabela "${TAXFARE_TABLE_NAME}"...`);
        const { error: deleteError } = await supabase.from(TAXFARE_TABLE_NAME).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (deleteError) {
          console.error('Erro ao deletar dados antigos de taxFare:', deleteError.message);
          throw deleteError;
        }
        console.log('Dados antigos de taxFare apagados com sucesso.');

        console.log(`Etapa B (TaxFare): Inserindo ${dataToInsert.length} novos registros...`);
        const { error: insertError } = await supabase.from(TAXFARE_TABLE_NAME).insert(dataToInsert);
        if (insertError) {
          console.error('Erro ao inserir dados de taxFare:', insertError.message);
          throw insertError;
        }

        console.log('✅ Tabela taxFare atualizada com sucesso no Supabase!');
      } catch (error) {
        console.error('Erro durante a atualização de taxFare:', error.message);
        throw error;
      }
    } else {
      console.log('Nenhum dado de taxFare para atualizar.');
    }
}

// --- FUNÇÃO PRINCIPAL ---
async function updateDatabase() {
    // Verifica se o arquivo de dados limpos existe
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
      const { error: deleteError } = await supabase.from(TABLE_NAME).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) throw deleteError;
      console.log('Dados antigos apagados com sucesso.');

      console.log(`Etapa B: Inserindo ${dataToInsert.length} novos registros...`);
      const { error: insertError } = await supabase.from(TABLE_NAME).insert(dataToInsert);
      if (insertError) throw insertError;

      console.log('✅ Base de dados atualizada com sucesso no Supabase!');
    } else {
      console.log('Nenhum dado para atualizar.');
    }

    // Atualizar taxFare
    try {
      await updateTaxFare();
    } catch (error) {
      console.error('Erro na atualização de taxFare, continuando com updates...');
    }

    // --- SOBRESCREVER DATA DA ÚLTIMA ATUALIZAÇÃO ---
    const now = new Date().toISOString();

    // Primeiro verifica se já existe algum registro
    const { data: existing, error: selectError } = await supabase
      .from(UPDATES_TABLE)
      .select('id')
      .limit(1)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // ignora "No rows found"
      console.error('Erro ao verificar tabela updates:', selectError.message);
    }

    if (existing) {
      // Atualiza o registro existente
      const { error: updateError } = await supabase
        .from(UPDATES_TABLE)
        .update({ lastUpdate: now })
        .eq('id', existing.id);
      if (updateError) console.error('Erro ao atualizar a tabela updates:', updateError.message);
      else console.log(`✅ Última atualização sobrescrita: ${now}`);
    } else {
      // Cria o registro se não existir
      const { error: insertUpdateError } = await supabase
        .from(UPDATES_TABLE)
        .insert([{ lastUpdate: now }]);
      if (insertUpdateError) console.error('Erro ao criar registro na tabela updates:', insertUpdateError.message);
      else console.log(`✅ Última atualização registrada: ${now}`);
    }
  } 


updateDatabase().finally(() => {
    console.log('Script de atualização finalizado.');
    process.exit(0);
});
