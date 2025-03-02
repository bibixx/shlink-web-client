import { faArrowRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useId } from 'react';
import { SubtleButton } from '../../../utils/components/SubtleButton';

export type QrTextControlProps = {
  name: string;
  label?: string;
  value?: string;
  placeholder?: string;
  onChange: (newValue?: string) => void;
};

export const QrTextControl: FC<QrTextControlProps> = ({ name, label, value, placeholder, onChange }) => {
  const id = useId();

  return (
    <>
      {value === undefined ? (
        <SubtleButton className="text-start fst-italic w-100" onClick={() => onChange(placeholder)}>
          Customize {name}
        </SubtleButton>
      ) : (
        <div className="d-flex gap-1 w-100">
          <div className="d-flex flex-column flex-grow-1">
            <label htmlFor={id} className="text-capitalize">{label ?? name}</label>
            <input
              id={id}
              type="text"
              className="form-control"
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
          <div className="align-self-end">
            <SubtleButton label={`Default ${name}`} onClick={() => onChange('')}>
              <FontAwesomeIcon icon={faArrowRotateLeft} />
            </SubtleButton>
          </div>
        </div>
      )}
    </>
  );
};
