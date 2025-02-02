import Dialog from '@mui/material/Dialog';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button/Button';
import DialogActions from '@mui/material/DialogActions/DialogActions';
import DialogContent from '@mui/material/DialogContent/DialogContent';
import DialogContentText from '@mui/material/DialogContentText/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPositiveClick: () => void;
  onNegativeClick: () => void;
  title: string;
  description: string;
  positiveText?: string;
  negativeText?: string;
  alert?: string;
}

function ConfirmationDialog(props: Props) {
  const { t } = useTranslation();

  const defaultProps = {
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    alert: t('transactions.deleteTransactionModalAlert'),
  };

  props = { ...defaultProps, ...props };
  const {
    isOpen,
    onClose,
    title,
    description,
    positiveText,
    negativeText,
    alert,
    onNegativeClick,
    onPositiveClick,
  } = props;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          <span>{description}</span>
          <br />
          <strong>{alert}</strong>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onNegativeClick}>{negativeText}</Button>
        <Button onClick={onPositiveClick} autoFocus>
          {positiveText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmationDialog;
