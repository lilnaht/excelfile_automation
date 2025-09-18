const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs').promises;

// --- CONFIGURAÇÕES ---
const INPUT_FILE_PATH = path.join(__dirname, "..", "..", "..", "01. Follow-UP", "Opened Import Processes.rev00.xlsx");
const OUTPUT_FILE_PATH = path.join(__dirname, 'data', 'cleaned_data.xlsx');
const DATA_DIR = path.join(__dirname, 'data');

const SHEET_NAME_TO_READ = 'DB Process';
const HEADER_ROW_NUMBER = 2;
const DATA_START_ROW = 3;
// --------------------

async function createCleanCopy() {
    console.log('Iniciando processo de limpeza com a biblioteca XLSX...');
    try {
        // Ler arquivo de origem
        console.log(`Lendo arquivo de origem: ${INPUT_FILE_PATH}`);
        const workbook = XLSX.readFile(INPUT_FILE_PATH);
        const worksheet = workbook.Sheets[SHEET_NAME_TO_READ];

        if (!worksheet) {
            throw new Error(`A planilha "${SHEET_NAME_TO_READ}" não foi encontrada no arquivo de origem!`);
        }
        console.log('Arquivo de origem lido com sucesso.');

        // Extrair dados
        const dataAsArrays = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        const headers = dataAsArrays[HEADER_ROW_NUMBER - 1];
        const dataRows = dataAsArrays.slice(DATA_START_ROW - 1);
        console.log(`${dataRows.length} linhas de dados extraídas.`);

        // Criar novo arquivo Excel
        const dataForNewSheet = [headers, ...dataRows];
        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.aoa_to_sheet(dataForNewSheet);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, SHEET_NAME_TO_READ);

        // Salvar arquivo limpo
        await fs.mkdir(DATA_DIR, { recursive: true });
        XLSX.writeFile(newWorkbook, OUTPUT_FILE_PATH);
        console.log(`✅ Arquivo limpo e leve criado com sucesso em: ${OUTPUT_FILE_PATH}`);

    } catch (error) {
        console.error('--- ❌ OCORREU UM ERRO DURANTE A LIMPEZA DO ARQUIVO ---');
        console.error(error.message);
    }
}

createCleanCopy();
