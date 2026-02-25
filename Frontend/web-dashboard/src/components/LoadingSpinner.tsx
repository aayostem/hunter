// components/LoadingSpinner.tsx
import React from 'react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'white';

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
  testId?: string;
}

const SIZE_MAP: Record<SpinnerSize, { width: number; height: number; borderWidth: number }> = {
  xs: { width: 12, height: 12, borderWidth: 2 },
  sm: { width: 16, height: 16, borderWidth: 2 },
  md: { width: 24, height: 24, borderWidth: 3 },
  lg: { width: 32, height: 32, borderWidth: 3 },
  xl: { width: 48, height: 48, borderWidth: 4 },
};

const VARIANT_MAP: Record<SpinnerVariant, { border: string; borderTop: string }> = {
  primary: { border: '#E5E7EB', borderTop: '#3B82F6' },
  secondary: { border: '#E5E7EB', borderTop: '#6B7280' },
  success: { border: '#E5E7EB', borderTop: '#10B981' },
  warning: { border: '#E5E7EB', borderTop: '#F59E0B' },
  danger: { border: '#E5E7EB', borderTop: '#EF4444' },
  white: { border: 'rgba(255,255,255,0.3)', borderTop: '#FFFFFF' },
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  text,
  fullScreen = false,
  overlay = false,
  className = '',
  testId,
}) => {
  const spinnerSize = SIZE_MAP[size];
  const spinnerVariant = VARIANT_MAP[variant];

  const spinner = (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      role="status"
      aria-label={text || 'Loading'}
      data-testid={testId}
    >
      <div
        style={{
          width: spinnerSize.width,
          height: spinnerSize.height,
          borderWidth: spinnerSize.borderWidth,
          borderColor: spinnerVariant.border,
          borderTopColor: spinnerVariant.borderTop,
        }}
        className="rounded-full animate-spin"
      />
      {text && (
        <p
          className={`mt-3 text-sm ${
            variant === 'white' ? 'text-white' : 'text-gray-600'
          }`}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// Full page loading component
export const FullPageSpinner: React.FC<Omit<LoadingSpinnerProps, 'fullScreen'>> = (props) => (
  <LoadingSpinner {...props} fullScreen />
);

// Content loading component
export const ContentSpinner: React.FC<Omit<LoadingSpinnerProps, 'overlay'>> = (props) => (
  <LoadingSpinner {...props} overlay />
);

// Inline loading component
export const InlineSpinner: React.FC<LoadingSpinnerProps> = (props) => (
  <div className="inline-flex items-center">
    <LoadingSpinner {...props} />
  </div>
);

// Button spinner component
export const ButtonSpinner: React.FC<{ size?: SpinnerSize; variant?: SpinnerVariant }> = ({
  size = 'sm',
  variant = 'white',
}) => (
  <LoadingSpinner size={size} variant={variant} className="inline-block" />
);