interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
  spacing?: 'sm' | 'md'
}

export function Label({ children, required, spacing = 'md', style, ...props }: LabelProps) {
  return (
    <label
      style={{
        display: 'block',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#3D5060',
        marginBottom: spacing === 'sm' ? 6 : 10,
        ...style,
      }}
      {...props}
    >
      {children}
      {required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
    </label>
  )
}

/** Wrapper: label + field + optional hint/error with consistent spacing */
export function FormField({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <Label required={required}>{label}</Label>
      {children}
      {(error || hint) && (
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: error ? '#EF4444' : '#3D5060',
          marginTop: 8,
          lineHeight: 1.5,
        }}>{error ?? hint}</p>
      )}
    </div>
  )
}
