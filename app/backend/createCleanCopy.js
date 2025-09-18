const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs').promises;

// --- CONFIGURAÇÕES DB PROCESS ---
const INPUT_FILE_PATH = path.join(__dirname, "..", "..", "..", "01. Follow-UP", "Opened Import Processes.rev00.xlsx");
const OUTPUT_FILE_PATH = path.join(__dirname, 'data', 'cleaned_data.xlsx');
const DATA_DIR = path.join(__dirname, 'data');

const SHEET_NAME_TO_READ = 'DB Process';
const HEADER_ROW_NUMBER = 2;
const DATA_START_ROW = 3;
// --------------------

// --- CONFIGURAÇÕES TAXFARE ---
const TAX_INPUT_FILE_PATH = path.join(__dirname, "..", "..", "..", "01. Follow-UP", "Opened Import Processes.rev00.xlsx");
const TAX_OUTPUT_FILE_PATH = path.join(__dirname, 'data', 'taxFare.xlsx');
const TAX_DATA_DIR = path.join(__dirname, 'data');

const TAX_SHEET_NAME_TO_READ = 'Support';
const TAX_HEADER_ROW_NUMBER = 1;
const TAX_DATA_START_ROW = 2;
// --------------------

async function createCleanCopy() {
    console.log('Iniciando processo de limpeza com a biblioteca XLSX...');
    try {
        // Ler arquivo de origem
        console.log(`Lendo arquivo para gerar processes: ${INPUT_FILE_PATH}`);
        const workbook = XLSX.readFile(INPUT_FILE_PATH);
        const worksheet = workbook.Sheets[SHEET_NAME_TO_READ];

        console.log(`Lendo arquivo para gerar taxFare: ${TAX_INPUT_FILE_PATH}`);
        const tax_workbook = XLSX.readFile(TAX_INPUT_FILE_PATH);
        const tax_worksheet = tax_workbook.Sheets[TAX_SHEET_NAME_TO_READ];

        // Process
        if (!worksheet) {
            throw new Error(`A planilha "${SHEET_NAME_TO_READ}" não foi encontrada no arquivo de origem!`);
        }
        console.log('Arquivo de origem lido com sucesso.');

        // Tax
        if (!tax_worksheet) {
            throw new Error(`A planilha "${TAX_SHEET_NAME_TO_READ}" não foi encontrada no arquivo de origem!`);
        }
        console.log('Arquivo de origem lido com sucesso.')


        // Extrair dados DB PROCESS
        const dataAsArrays = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        const headers = dataAsArrays[HEADER_ROW_NUMBER - 1];
        const dataRows = dataAsArrays.slice(DATA_START_ROW - 1);
        console.log(`${dataRows.length} linhas de dados extraídas.`);

        // Extrair dados TAX FARE (somente colunas A-J)
        const tax_dataAsArrays = XLSX.utils.sheet_to_json(tax_worksheet, { header: 1, defval: "" });
        const tax_headers = tax_dataAsArrays[TAX_HEADER_ROW_NUMBER - 1].slice(0, 10); // A-J = 10 colunas
        const tax_dataRows = tax_dataAsArrays.slice(TAX_DATA_START_ROW - 1).map(row => row.slice(0, 10));
        console.log(`${tax_dataRows.length} linhas de dados extraídas (colunas A-J).`);


        // Criar novo arquivo Excel DB PROCESS
        const dataForNewSheet = [headers, ...dataRows];
        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.aoa_to_sheet(dataForNewSheet);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, SHEET_NAME_TO_READ);

        // Criar novo arquivo Excel Tax
        const tax_dataForNewSheet = [tax_headers, ...tax_dataRows];
        const tax_newWorkbook = XLSX.utils.book_new();
        const tax_newWorksheet = XLSX.utils.aoa_to_sheet(tax_dataForNewSheet);
        XLSX.utils.book_append_sheet(tax_newWorkbook, tax_newWorksheet, TAX_SHEET_NAME_TO_READ);


        // Salvar arquivo DB PROCESS
        await fs.mkdir(DATA_DIR, { recursive: true });
        XLSX.writeFile(newWorkbook, OUTPUT_FILE_PATH);
        console.log(`✅ Arquivo criado com sucesso em: ${OUTPUT_FILE_PATH}`);

        // Salvar arquivo Tax
        await fs.mkdir(DATA_DIR, { recursive: true });
        XLSX.writeFile(tax_newWorkbook, TAX_OUTPUT_FILE_PATH);
        console.log(`✅ Arquivo criado com sucesso em: ${TAX_OUTPUT_FILE_PATH}`);

    } catch (error) {
        console.error('--- ❌ OCORREU UM ERRO DURANTE A LIMPEZA DO ARQUIVO ---');
        console.error(error.message);
    }
}

createCleanCopy();
