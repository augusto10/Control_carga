declare module 'react-input-mask' {
  import * as React from 'react';

  interface ReactInputMaskProps {
    mask: string;
    value?: string;
    defaultValue?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    children?: (inputProps: Record<string, any>) => React.ReactNode;
    maskChar?: string | null;
    alwaysShowMask?: boolean;
    formatChars?: Record<string, string>;
  }

  export default class ReactInputMask extends React.Component<ReactInputMaskProps> {}
}
