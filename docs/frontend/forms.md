# Forms

QuickDapp provides comprehensive form handling capabilities using React Hook Form for form state management and validation. The form system integrates seamlessly with the component library and provides excellent developer experience.

## Form Library

### React Hook Form Integration

QuickDapp uses React Hook Form for its performance and developer experience:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  symbol: z.string().max(6, 'Symbol must be 6 characters or less'),
  initialSupply: z.string().min(1, 'Supply is required')
})

type FormData = z.infer<typeof schema>

export function TokenForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange'
  })
  
  const onSubmit = async (data: FormData) => {
    // Handle form submission
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

## Form Components

### Input Component

The base Input component handles labels, errors, and validation states:

```typescript
// src/client/components/ui/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  description?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, description, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium">
            {label}
          </label>
        )}
        
        <input
          className={clsx(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          {...props}
        />
        
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)
```

### Form Field Wrapper

For consistent form field styling and behavior:

```typescript
// src/client/components/forms/FormField.tsx
interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  description?: string
  children: React.ReactNode
}

export function FormField({ 
  label, 
  error, 
  required, 
  description, 
  children 
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      
      {children}
      
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
```

## Validation

### Zod Schema Validation

Use Zod for runtime validation and type safety:

```typescript
// src/client/lib/validation.ts
import { z } from 'zod'

export const deployTokenSchema = z.object({
  name: z
    .string()
    .min(1, 'Token name is required')
    .max(50, 'Token name must be 50 characters or less'),
  
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(6, 'Symbol must be 6 characters or less')
    .regex(/^[A-Z]+$/, 'Symbol must contain only uppercase letters'),
  
  initialSupply: z
    .string()
    .min(1, 'Initial supply is required')
    .refine((val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num > 0 && num <= 1000000000
    }, 'Initial supply must be a valid number between 1 and 1,000,000,000')
})

export const transferTokenSchema = z.object({
  recipient: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num > 0
    }, 'Amount must be greater than 0')
})
```

### Custom Validation Hooks

Create reusable validation logic:

```typescript
// src/client/hooks/useFormValidation.ts
import { useCallback } from 'react'
import { isAddress } from 'viem'

export function useFormValidation() {
  const validateEthereumAddress = useCallback((address: string) => {
    if (!address) return 'Address is required'
    if (!isAddress(address)) return 'Invalid Ethereum address'
    return true
  }, [])
  
  const validatePositiveNumber = useCallback((value: string, fieldName = 'Value') => {
    if (!value) return `${fieldName} is required`
    const num = parseFloat(value)
    if (isNaN(num)) return `${fieldName} must be a valid number`
    if (num <= 0) return `${fieldName} must be greater than 0`
    return true
  }, [])
  
  const validateTokenSymbol = useCallback((symbol: string) => {
    if (!symbol) return 'Symbol is required'
    if (symbol.length > 6) return 'Symbol must be 6 characters or less'
    if (!/^[A-Z]+$/.test(symbol)) return 'Symbol must contain only uppercase letters'
    return true
  }, [])
  
  return {
    validateEthereumAddress,
    validatePositiveNumber,
    validateTokenSymbol
  }
}
```

## Form Examples

### Token Deployment Form

Complete form for deploying new tokens:

```typescript
// src/client/components/forms/DeployTokenForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { deployTokenSchema } from '../../lib/validation'
import { useDeployToken } from '../../hooks/useTokens'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { FormField } from './FormField'

type DeployTokenFormData = z.infer<typeof deployTokenSchema>

interface DeployTokenFormProps {
  onSuccess?: (tokenData: any) => void
}

export function DeployTokenForm({ onSuccess }: DeployTokenFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    reset,
    watch
  } = useForm<DeployTokenFormData>({
    resolver: zodResolver(deployTokenSchema),
    mode: 'onChange'
  })
  
  const deployToken = useDeployToken()
  
  // Watch symbol field to auto-uppercase
  const symbolValue = watch('symbol')
  
  const onSubmit = async (data: DeployTokenFormData) => {
    try {
      const result = await deployToken.mutateAsync({
        ...data,
        symbol: data.symbol.toUpperCase()
      })
      
      reset()
      onSuccess?.(result)
    } catch (error) {
      console.error('Failed to deploy token:', error)
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormField
        label="Token Name"
        error={errors.name?.message}
        required
        description="The full name of your token (e.g., 'My Awesome Token')"
      >
        <Input
          {...register('name')}
          placeholder="My Awesome Token"
          disabled={isSubmitting}
        />
      </FormField>
      
      <FormField
        label="Symbol"
        error={errors.symbol?.message}
        required
        description="Short symbol for your token (max 6 uppercase letters)"
      >
        <Input
          {...register('symbol')}
          placeholder="MAT"
          style={{ textTransform: 'uppercase' }}
          disabled={isSubmitting}
        />
      </FormField>
      
      <FormField
        label="Initial Supply"
        error={errors.initialSupply?.message}
        required
        description="Number of tokens to create initially"
      >
        <Input
          {...register('initialSupply')}
          type="number"
          step="1"
          min="1"
          max="1000000000"
          placeholder="1000000"
          disabled={isSubmitting}
        />
      </FormField>
      
      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          disabled={!isValid || isSubmitting || deployToken.isPending}
          loading={isSubmitting || deployToken.isPending}
          className="flex-1"
        >
          {deployToken.isPending ? 'Deploying...' : 'Deploy Token'}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          disabled={isSubmitting || deployToken.isPending}
        >
          Clear
        </Button>
      </div>
    </form>
  )
}
```

### Token Transfer Form

Form for transferring tokens between addresses:

```typescript
// src/client/components/forms/TransferTokenForm.tsx
export function TransferTokenForm({ 
  tokenAddress, 
  onSuccess 
}: TransferTokenFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue
  } = useForm<TransferTokenFormData>({
    resolver: zodResolver(transferTokenSchema),
    mode: 'onChange'
  })
  
  const { symbol, decimals } = useTokenInfo(tokenAddress)
  const { balance } = useTokenBalance(tokenAddress)
  const transfer = useTokenTransfer(tokenAddress, decimals)
  
  const onSubmit = async (data: TransferTokenFormData) => {
    try {
      await transfer.mutateAsync(data)
      reset()
      onSuccess?.()
    } catch (error) {
      console.error('Transfer failed:', error)
    }
  }
  
  const setMaxAmount = () => {
    if (balance && decimals) {
      const maxAmount = formatUnits(balance, decimals)
      setValue('amount', maxAmount, { shouldValidate: true })
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormField
        label="Recipient Address"
        error={errors.recipient?.message}
        required
        description="Ethereum address to send tokens to"
      >
        <Input
          {...register('recipient')}
          placeholder="0x742d35Cc6634C0532925a3b8D30eE5528c097Eff"
          className="font-mono text-sm"
        />
      </FormField>
      
      <FormField
        label={`Amount (${symbol})`}
        error={errors.amount?.message}
        required
        description={`Available balance: ${formatTokenAmount(balance, decimals)} ${symbol}`}
      >
        <div className="flex gap-2">
          <Input
            {...register('amount')}
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setMaxAmount}
          >
            Max
          </Button>
        </div>
      </FormField>
      
      <Button
        type="submit"
        disabled={!isValid || transfer.isPending}
        loading={transfer.isPending}
        className="w-full"
      >
        {transfer.isPending ? 'Transferring...' : 'Transfer Tokens'}
      </Button>
    </form>
  )
}
```

## Form State Management

### Loading States

Handle loading states consistently across forms:

```typescript
export function FormSubmitButton({ 
  isSubmitting, 
  isPending, 
  isValid, 
  children 
}: FormSubmitButtonProps) {
  const isLoading = isSubmitting || isPending
  
  return (
    <Button
      type="submit"
      disabled={!isValid || isLoading}
      loading={isLoading}
    >
      {children}
    </Button>
  )
}
```

### Error Handling

Consistent error handling pattern:

```typescript
// src/client/hooks/useFormSubmission.ts
export function useFormSubmission<T>(
  onSubmit: (data: T) => Promise<void>,
  onSuccess?: () => void
) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async (data: T) => {
    setError(null)
    setIsSubmitting(true)
    
    try {
      await onSubmit(data)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return {
    handleSubmit,
    error,
    isSubmitting,
    clearError: () => setError(null)
  }
}
```

## Best Practices

### Form UX Guidelines

1. **Real-time Validation** - Show errors as users type for immediate feedback
2. **Clear Error Messages** - Provide specific, actionable error messages
3. **Loading States** - Show loading indicators during form submission
4. **Success Feedback** - Confirm successful actions with notifications
5. **Accessibility** - Proper labeling and keyboard navigation

### Performance Optimization

```typescript
// Memoize form components to prevent unnecessary re-renders
export const DeployTokenForm = memo(function DeployTokenForm(props: Props) {
  // Form implementation
})

// Use React Hook Form's mode: 'onChange' for real-time validation
// but consider 'onBlur' for complex validation to improve performance
const form = useForm({
  mode: 'onChange', // or 'onBlur' for better performance
  resolver: zodResolver(schema)
})
```

The form system in QuickDapp provides a robust foundation for building user-friendly, accessible, and performant forms with comprehensive validation and error handling.