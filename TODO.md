# TODO: Implement TaxFare Import to Supabase

## Tasks
- [x] Add TAXFARE_DATA_PATH constant for taxFare.xlsx file path
- [x] Create updateTaxFare() function to read taxFare.xlsx and insert data into 'taxfare' table
- [x] Modify updateDatabase() function to call updateTaxFare() after updating 'processos' table
- [x] Add error handling and logging for taxFare import
- [x] Add updates table logging at the end
- [x] Test the integrated import functionality
