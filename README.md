# Gerador de Previsão de Custos

Uma aplicação desktop para gerar arquivos Excel detalhados de previsão de custos para processos de importação, construída com Electron, Node.js e Supabase.

## Visão Geral

Esta aplicação automatiza a criação de planilhas abrangentes de previsão de custos para operações de importação. Ela recupera dados de processos de um banco de dados Supabase, preenche modelos Excel com informações de preços atuais e gera arquivos de saída com controle de revisão.

## Funcionalidades

### Funcionalidades Principais
- **Geração Automática de Excel**: Cria planilhas detalhadas de previsão de custos com informações de produtos, preços, impostos e dados logísticos
- **Integração com Banco de Dados**: Conecta ao Supabase para recuperação e atualização de dados em tempo real
- **Câmbio**: Busca automaticamente as taxas de câmbio USD/BRL atuais da API do Banco Central do Brasil
- **Controle de Revisão**: Mantém histórico de versões para arquivos gerados com numeração automática de revisão
- **Cálculos de Impostos**: Inclui impostos brasileiros de importação (II, PIS, COFINS, IPI) com formatação adequada

### Interface do Usuário
- **Aplicação Desktop**: Aplicativo Electron multiplataforma com suporte nativo para Windows, macOS e Linux
- **Atualizações em Tempo Real**: Sincronização de banco de dados sob demanda com feedback de progresso
- **Monitoramento de Status**: Status de conexão ao vivo e rastreamento da última atualização
- **Gerenciamento de Arquivos**: Organização automática de arquivos e capacidades de download

### Funcionalidades Técnicas
- **Geração Baseada em Processo**: Gera previsões para processos específicos de importação por ID
- **Sistema de Modelos**: Usa modelos Excel pré-configurados com formatação adequada
- **Tratamento de Erros**: Log abrangente de erros e feedback ao usuário
- **Processamento em Segundo Plano**: Geração de arquivos e atualizações de banco de dados não bloqueantes

## Arquitetura

### Backend (Node.js/Express)
- **Servidor**: Servidor Express.js manipulando solicitações de API
- **Banco de Dados**: Integração com Supabase para armazenamento e recuperação de dados
- **Processamento de Arquivos**: ExcelJS para manipulação de arquivos Excel
- **APIs Externas**: API do Banco Central do Brasil para taxas de câmbio

### Frontend (Electron)
- **Processo Principal**: Ciclo de vida da aplicação e comunicação IPC
- **Processo de Renderização**: Interface do usuário e manipulação de interações
- **Comunicação IPC**: Comunicação segura entre processos entre frontend e backend

### Fluxo de Dados
1. Usuário inicia atualização do banco de dados ou geração de arquivo
2. Backend consulta Supabase para dados do processo
3. Aplicação busca taxas de câmbio atuais
4. Modelo Excel é preenchido com dados e cálculos
5. Arquivo é salvo com controle de revisão
6. Usuário recebe link de download e feedback de status

## Instalação

### Pré-requisitos
- Node.js 18 ou posterior
- Gerenciador de pacotes npm ou yarn
- Conta e projeto Supabase

### Configuração
1. Clone o repositório
2. Instale as dependências:
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. Configure variáveis de ambiente em `backend/.env`:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   ```

4. Coloque o arquivo de modelo Excel em `backend/data/Excel_base/base.xlsx`

5. Execute a aplicação:
   ```bash
   npm start
   ```

## Uso

### Atualizações do Banco de Dados
- Clique em "Update Database" para sincronizar dados de fontes externas
- Monitore o progresso através de logs do console e feedback da interface
- Tratamento automático de erros e mecanismos de retry

### Geração de Arquivos
1. Digite o ID do processo no campo de entrada
2. Clique em "Generate File" para criar a previsão de custos
3. Baixe o arquivo Excel gerado
4. Os arquivos são automaticamente versionados e organizados por processo

### Monitoramento
- Visualize o status de conexão na interface da aplicação
- Verifique o timestamp da última atualização
- Revise logs detalhados no console para solução de problemas

## Endpoints da API

### GET /status
Retorna o status de conexão do banco de dados.

### GET /last-update
Recupera o timestamp da última atualização do banco de dados.

### POST /generate-file
Gera arquivo Excel para o processo especificado.
```json
{
  "process_input": "PROCESS_ID"
}
```

### GET /download-file/:fileName
Faz download do arquivo Excel gerado.

## Configuração

### Variáveis de Ambiente
- `SUPABASE_URL`: URL do seu projeto Supabase
- `SUPABASE_SERVICE_KEY`: Chave de função de serviço para acesso ao banco de dados

### Estrutura de Arquivos
```
app/
├── backend/
│   ├── data/Excel_base/base.xlsx    # Modelo Excel
│   ├── server.js                    # Arquivo principal do servidor
│   ├── updateDatabase.js           # Script de atualização do banco de dados
│   └── .env                        # Variáveis de ambiente
├── frontend/
│   ├── main.js                     # Processo principal do Electron
│   ├── preload.js                  # Script de preload IPC
│   └── renderer/                   # Arquivos da interface
└── generated/                      # Diretório de saída
```

## Desenvolvimento

### Estrutura do Projeto
- **backend/**: Lógica do lado do servidor, endpoints da API, processamento de arquivos
- **frontend/**: Aplicação Electron, componentes da interface
- **generated/**: Arquivos de saída organizados por ID do processo

### Tecnologias Principais
- **Electron**: Framework de aplicação desktop multiplataforma
- **Express.js**: Framework de servidor web
- **Supabase**: Backend-as-a-Service para operações de banco de dados
- **ExcelJS**: Biblioteca de manipulação de arquivos Excel
- **Axios**: Cliente HTTP para chamadas de API externas

### Logging
A aplicação usa logging estruturado com prefixos de status:
- `[START]`: Eventos de inicialização da aplicação
- `[INFO]`: Mensagens de informação geral
- `[SUCCESS]`: Operações bem-sucedidas
- `[ERROR]`: Condições de erro
- `[UPDATE]`: Operações de atualização do banco de dados
- `[STDOUT/STDERR]`: Saída de processos filhos

## Solução de Problemas

### Problemas Comuns
- **Conexão com Banco de Dados**: Verifique credenciais do Supabase e conectividade de rede
- **Geração de Arquivos**: Garanta que o modelo Excel existe e tem a estrutura correta
- **Taxas de Câmbio**: Verifique conexão com internet para acesso à API de câmbio
- **Permissões**: Verifique permissões de escrita para o diretório de saída

### Logs
Verifique a saída do console para mensagens detalhadas de erro e status de operação. Todas as operações são registradas com timestamps e indicadores de status.

## Licença

Este projeto é software proprietário. Todos os direitos reservados.

## Suporte

Para suporte técnico ou dúvidas sobre a aplicação, entre em contato com a equipe de desenvolvimento.
