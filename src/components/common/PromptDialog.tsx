import { useState } from 'react';
import { Modal, TextInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';

interface PromptDialogProps {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  open,
  title,
  label,
  placeholder,
  defaultValue = '',
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const { t } = useTranslation('common');
  // Use key prop to reset component state when dialog opens with new defaultValue
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = () => {
    if (value.trim()) {
      onConfirm(value.trim());
      setValue('');
    }
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  return (
    <Modal
      key={open ? defaultValue : 'closed'}
      open={open}
      onRequestClose={handleCancel}
      modalHeading={title}
      primaryButtonText={t('actions.confirm')}
      secondaryButtonText={t('actions.cancel')}
      onRequestSubmit={handleSubmit}
      primaryButtonDisabled={!value.trim()}
    >
      <TextInput
        id="prompt-input"
        labelText={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            handleSubmit();
          }
        }}
      />
    </Modal>
  );
}

