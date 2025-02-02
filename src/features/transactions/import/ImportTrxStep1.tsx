import { AccountCircle, KeyboardDoubleArrowRight } from '@mui/icons-material';
import Button from '@mui/material/Button/Button';
import { Trans, useTranslation } from 'react-i18next';
import {
  useImportTransactionsStep0,
  useImportTransactionsStep1,
} from '../../../services/trx/trxHooks.ts';
import { useEffect, useState } from 'react';
import { useLoading } from '../../../providers/LoadingProvider.tsx';
import {
  AlertSeverity,
  useSnackbar,
} from '../../../providers/SnackbarProvider.tsx';
import { Account } from '../../../services/auth/authServices.ts';
import {
  Autocomplete,
  MenuItem,
  Select,
  Typography,
  useTheme,
} from '@mui/material';
import MyFinStaticTable from '../../../components/MyFinStaticTable.tsx';
import { GridColDef } from '@mui/x-data-grid';
import { countBy } from 'lodash';
import TextField from '@mui/material/TextField/TextField';
import InputAdornment from '@mui/material/InputAdornment/InputAdornment';
import Grid from '@mui/material/Unstable_Grid2/Grid2';
import { IdLabelPair } from '../AddEditTransactionDialog.tsx';
import {
  ExportedTransactionItem,
  ImportTransactionsStep1Response,
  TransactionType,
} from '../../../services/trx/trxServices.ts';
import {
  checkIfFieldsAreFilled,
  convertStringToFloat,
} from '../../../utils/textUtils.ts';
import { convertDateStringToUnixTimestamp } from '../../../utils/dateUtils.ts';

export type Props = {
  clipboardText: string;
  onNext: (result: ImportTrxStep1Result) => void;
};

export type ImportTrxStep1Result = ImportTransactionsStep1Response & {
  selectedAccountId: bigint;
};

const ImportTrxStep1 = (props: Props) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const loader = useLoading();
  const snackbar = useSnackbar();
  const importTrxStep0Request = useImportTransactionsStep0();
  const importTrxStep1Request = useImportTransactionsStep1();
  const [accounts, setUserAccounts] = useState<Account[]>([]);
  const [accountOptionsValue, setAccountOptionsValue] = useState<IdLabelPair[]>(
    [],
  );
  const [selectedAccount, setSelectedAccount] = useState<IdLabelPair | null>(
    null,
  );
  const [rows, setRows] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<
    Record<string, FIELD_MAPPING>
  >({});

  const IMPORT_TRX_FIELD_HEADER_VARIATIONS = {
    DATE: [
      'date',
      'data',
      'data da operação',
      'data de operação',
      'data do movimento',
      'data de movimento',
      'data valor',
      'data operação',
    ],
    DESCRIPTION: [
      'description',
      'descrição',
      'descrição da operação',
      'descrição de operação',
      'descrição do movimento',
      'descrição de movimento',
      'movimento',
    ],
    AMOUNT: [
      'amount',
      'montante',
      'montante',
      'valor',
      'montante (eur)',
      'montante(eur)',
      'montante(€)',
      'montante (€)',
      'montante( eur )',
    ],
    CREDIT: ['credit', 'crédito', 'receita'],
    DEBIT: ['debit', 'débito', 'despesa'],
    TYPE: [
      'type',
      'tipo',
      'tipo de operação',
      'tipo de movimento',
      'tipo de transação',
    ],
  };

  const handleMappingChange = (columnIndex: number, value: FIELD_MAPPING) => {
    setColumnMappings((prev) => ({
      ...prev,
      [`column-${columnIndex}`]: value,
    }));
  };

  enum FIELD_MAPPING {
    IGNORE = 'ignore',
    DATE = 'date',
    DESCRIPTION = 'description',
    AMOUNT = 'amount',
    CREDIT = 'credit',
    DEBIT = 'debit',
    TYPE = 'type',
  }

  // Loading
  useEffect(() => {
    if (importTrxStep0Request.isPending || importTrxStep1Request.isPending) {
      loader.showLoading();
    } else {
      loader.hideLoading();
    }
  }, [importTrxStep0Request.isPending, importTrxStep1Request.isPending]);

  // Error
  useEffect(() => {
    if (importTrxStep0Request.isError || importTrxStep1Request.isError) {
      snackbar.showSnackbar(
        t('common.somethingWentWrongTryAgain'),
        AlertSeverity.ERROR,
      );
    }
  }, [importTrxStep0Request.isError, importTrxStep1Request.isError]);

  // Success
  useEffect(() => {
    if (importTrxStep0Request.data) {
      //(importTrxStep0Request.data.accounts);
      setUserAccounts(importTrxStep0Request.data || []);
      parseClipboardData(props.clipboardText);
    }
  }, [importTrxStep0Request.data]);

  useEffect(() => {
    if (importTrxStep1Request.isSuccess && importTrxStep1Request.data) {
      props.onNext({
        ...importTrxStep1Request.data,
        selectedAccountId: selectedAccount?.id || -1n,
      });
    }
  }, [importTrxStep1Request.data]);

  useEffect(() => {
    if (accounts) {
      const userAccounts = transformUserAccountsIntoIdLabelPair(accounts);
      setAccountOptionsValue(userAccounts);
    }
  }, [accounts]);

  const transformUserAccountsIntoIdLabelPair = (userAccounts: Account[]) => {
    return userAccounts.map((acc) => ({
      id: acc.account_id,
      label: acc.name,
    }));
  };

  if (importTrxStep0Request.isPending || !importTrxStep0Request.data) {
    return null;
  }

  const guessColumnMapping = (row: string): FIELD_MAPPING => {
    if (IMPORT_TRX_FIELD_HEADER_VARIATIONS.DATE.includes(row.toLowerCase())) {
      return FIELD_MAPPING.DATE;
    }

    if (IMPORT_TRX_FIELD_HEADER_VARIATIONS.CREDIT.includes(row.toLowerCase())) {
      return FIELD_MAPPING.CREDIT;
    }

    if (IMPORT_TRX_FIELD_HEADER_VARIATIONS.DEBIT.includes(row.toLowerCase())) {
      return FIELD_MAPPING.DEBIT;
    }

    if (IMPORT_TRX_FIELD_HEADER_VARIATIONS.TYPE.includes(row.toLowerCase())) {
      return FIELD_MAPPING.TYPE;
    }

    if (IMPORT_TRX_FIELD_HEADER_VARIATIONS.AMOUNT.includes(row.toLowerCase())) {
      return FIELD_MAPPING.AMOUNT;
    }

    if (
      IMPORT_TRX_FIELD_HEADER_VARIATIONS.DESCRIPTION.includes(row.toLowerCase())
    ) {
      return FIELD_MAPPING.DESCRIPTION;
    }

    return FIELD_MAPPING.IGNORE;
  };

  const tryToPrefillHeaders = (firstRow: string[]) => {
    const initialMappings: Record<string, FIELD_MAPPING> = {};

    firstRow.map((row, index) => {
      initialMappings[`column-${index}`] = guessColumnMapping(row);
    });
    setColumnMappings(initialMappings);
  };

  const parseClipboardData = (data: string) => {
    const rows = data.split('\n');
    setRows(rows);
    tryToPrefillHeaders(rows[0].split('\t'));
  };

  interface GridValidRowModel {
    id: string;
    [key: string]: string; // This allows for additional string properties
  }

  const buildRowsForTable = (rows: string[]): GridValidRowModel[] => {
    return rows.map(
      (row, j) =>
        row.split('\t').reduce((acc: GridValidRowModel, row, i) => {
          acc.id = j + '+' + i;
          acc[`${i}`] = row; // Cast i to string for indexing
          return acc;
        }, {} as GridValidRowModel), // Initialize with empty GridValidRowModel
    );
  };

  const buildColumnsForTable = (rows: string[]): GridColDef[] => {
    const nColumns = rows[0]?.split('\t').length || 0;
    if (nColumns < 1) return [];
    return rows[0].split('\t').map((_row, i) => ({
      field: `column-${i}`,
      renderHeader: (_params) => {
        return (
          <Select
            id={`select-${i}`}
            value={columnMappings[`column-${i}`] || FIELD_MAPPING.IGNORE}
            onChange={(e) =>
              handleMappingChange(i, e.target.value as FIELD_MAPPING)
            }
          >
            <MenuItem value={FIELD_MAPPING.IGNORE}>
              {t('common.ignore')}
            </MenuItem>
            <MenuItem value={FIELD_MAPPING.DATE}>
              {t('common.date')} (DD-MM-YYYY)
            </MenuItem>
            <MenuItem value={FIELD_MAPPING.DESCRIPTION}>
              {t('common.description')}
            </MenuItem>
            <MenuItem value={FIELD_MAPPING.AMOUNT}>
              {t('common.amount')}
            </MenuItem>
            <MenuItem value={FIELD_MAPPING.CREDIT}>
              {t('common.credit')}
            </MenuItem>
            <MenuItem value={FIELD_MAPPING.DEBIT}>{t('common.debit')}</MenuItem>
            <MenuItem value={FIELD_MAPPING.TYPE}>{t('common.type')}</MenuItem>
          </Select>
        );
      },
      editable: false,
      sortable: false,
      flex: 1,
      renderCell: (params) => {
        return <p>{params.row?.[i]}</p>;
      },
    }));
  };

  const getColumnNumberForMapping = (field: FIELD_MAPPING): number | null => {
    const column = Object.entries(columnMappings)
      .find(([_, value]) => value === field)?.[0]
      ?.split('-')[1];
    if (column) return parseInt(column);
    return null;
  };

  const parseTransactions = () => {
    const trxs: ExportedTransactionItem[] = [];
    rows.forEach((row) => {
      const columns = row.split('\t');
      const amountAndTypeInferred = inferTrxAmountAndType(columns);
      const date = columns[getColumnNumberForMapping(FIELD_MAPPING.DATE) ?? -1];
      const description =
        columns[getColumnNumberForMapping(FIELD_MAPPING.DESCRIPTION) ?? -1];
      const amount = amountAndTypeInferred.amount;
      const type = amountAndTypeInferred.type;
      if (checkIfFieldsAreFilled([date, description, amount + '', type])) {
        try {
          const unixDate = convertDateStringToUnixTimestamp(date);
          trxs.push({
            date: unixDate,
            description,
            amount,
            type,
          });
        } catch (error) {
          /* no-op */
        }
      }
    });

    return trxs;
  };

  const inferTrxAmountAndType = (
    row: string[],
  ): { amount: number; type: TransactionType } => {
    const amountColumn = getColumnNumberForMapping(FIELD_MAPPING.AMOUNT);
    const creditColumn = getColumnNumberForMapping(FIELD_MAPPING.CREDIT);
    const debitColumn = getColumnNumberForMapping(FIELD_MAPPING.DEBIT);
    const typeColumn = getColumnNumberForMapping(FIELD_MAPPING.TYPE);

    let amount;
    let type;

    if (amountColumn && row[amountColumn] && amountColumn && !typeColumn) {
      amount = convertStringToFloat(row[amountColumn].replace(/ /g, ''));
      type = amount > 0 ? TransactionType.Income : TransactionType.Expense;
    } else if (creditColumn && !typeColumn) {
      amount = convertStringToFloat(row[creditColumn] ?? '');
      type = TransactionType.Income;
    }

    if (!amount && debitColumn && !typeColumn) {
      amount = convertStringToFloat(row[debitColumn] ?? '');
      type = TransactionType.Expense;
    } else if (!amount && amountColumn && typeColumn) {
      amount = convertStringToFloat(row[amountColumn] ?? '');
      switch (row[typeColumn]) {
        case FIELD_MAPPING.DEBIT:
          type = TransactionType.Expense;
          break;
        case FIELD_MAPPING.CREDIT:
          type = TransactionType.Income;
          break;
      }
    }

    return {
      amount: Math.abs(amount || 0),
      type: type || TransactionType.Expense,
    };
  };

  const handleContinueButtonClick = () => {
    switch (validateInput()) {
      case VALIDATE_INPUT_RESULT.VALID:
        {
          const parsedTrxs = parseTransactions();
          importTrxStep1Request.mutate({
            account_id: selectedAccount?.id || -1n,
            trx_list: parsedTrxs,
          });
        }
        break;

      case VALIDATE_INPUT_RESULT.ERROR_MISSING_REQUIRED_FIELDS:
        snackbar.showSnackbar(
          t('common.fillAllFieldsTryAgain'),
          AlertSeverity.ERROR,
        );
        break;

      case VALIDATE_INPUT_RESULT.ERROR_DUPLICATED_FIELDS:
        snackbar.showSnackbar(
          t('transactions.pleaseDoNotSelectDuplicatedFields'),
          AlertSeverity.ERROR,
        );
        break;

      case VALIDATE_INPUT_RESULT.ERROR_MISSING_ACCOUNT:
        snackbar.showSnackbar(
          t('transactions.pleaseSelectAnAccountToAssociateWithTrx'),
          AlertSeverity.ERROR,
        );
        break;
    }
  };

  enum VALIDATE_INPUT_RESULT {
    VALID,
    ERROR_DUPLICATED_FIELDS,
    ERROR_MISSING_ACCOUNT,
    ERROR_MISSING_REQUIRED_FIELDS,
  }

  /**
   * There must be ONE column for each of the following
   * fields: DATE, DESCRIPTION & AMOUNT (or CREDIT/DEBIT or TYPE & AMOUNT)
   */
  const validateInput = (): VALIDATE_INPUT_RESULT => {
    if (selectedAccount == null) {
      return VALIDATE_INPUT_RESULT.ERROR_MISSING_ACCOUNT;
    }

    const assignCount = countBy(Object.values(columnMappings));
    assignCount[FIELD_MAPPING.IGNORE] = -1;
    if (Object.values(assignCount).some((elem) => elem > 1)) {
      return VALIDATE_INPUT_RESULT.ERROR_DUPLICATED_FIELDS;
    }

    if (
      !Object.hasOwn(assignCount, FIELD_MAPPING.DATE) ||
      !Object.hasOwn(assignCount, FIELD_MAPPING.DESCRIPTION) ||
      (!Object.hasOwn(assignCount, FIELD_MAPPING.AMOUNT) &&
        !Object.hasOwn(assignCount, FIELD_MAPPING.CREDIT) &&
        !Object.hasOwn(assignCount, FIELD_MAPPING.DEBIT) &&
        !Object.hasOwn(assignCount, FIELD_MAPPING.TYPE)) ||
      (Object.hasOwn(assignCount, FIELD_MAPPING.TYPE) &&
        !Object.hasOwn(assignCount, FIELD_MAPPING.AMOUNT))
    ) {
      return VALIDATE_INPUT_RESULT.ERROR_MISSING_REQUIRED_FIELDS;
    }

    return VALIDATE_INPUT_RESULT.VALID;
  };

  return (
    <>
      <Grid container direction="column" spacing={2}>
        <Grid>
          <Typography variant="body1" component="div" sx={{ mt: 2, mb: 2 }}>
            <Trans i18nKey="importTransactions.step1Text" />
          </Typography>
        </Grid>
        <Grid xs={2}>
          <Autocomplete
            id="account"
            options={accountOptionsValue}
            value={selectedAccount}
            onChange={(_event, value) => {
              setSelectedAccount(value as IdLabelPair);
            }}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircle />
                    </InputAdornment>
                  ),
                }}
                label={t('transactions.originAccount')}
              />
            )}
          />
        </Grid>
        <Grid xs={12}>
          <MyFinStaticTable
            isRefetching={false}
            rows={buildRowsForTable(rows)}
            columns={buildColumnsForTable(rows)}
            paginationModel={{
              pageSize: 100,
            }}
          />
        </Grid>
        <Grid sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            endIcon={<KeyboardDoubleArrowRight />}
            onClick={() => handleContinueButtonClick()}
            sx={{ width: 'fit-content', mt: theme.spacing(2) }}
          >
            {t('transactions.continueImport')}
          </Button>
        </Grid>
      </Grid>
    </>
  );
};

export default ImportTrxStep1;
