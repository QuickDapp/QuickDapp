# Forms

QuickDapp uses simple React state management for form handling. Forms integrate with the GraphQL API and provide basic validation and error handling.

## Form Components

### Basic Form Structure

Forms use standard React state with simple validation:

```typescript
import * as React from "react"
import { Button } from "./Button"
import { Form, Input, Label } from "./Form"

interface FormData {
  name: string
  symbol: string
  initialSupply: string
}

interface FormErrors {
  name?: string
  symbol?: string
  initialSupply?: string
}

export function TokenForm() {
  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    symbol: '',
    initialSupply: ''
  })
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required'
    } else if (formData.symbol.length > 6) {
      newErrors.symbol = 'Symbol must be 6 characters or less'
    }
    
    if (!formData.initialSupply.trim()) {
      newErrors.initialSupply = 'Initial supply is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    try {
      // Handle form submission
      await submitForm(formData)
    } catch (error) {
      // Handle error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="name">Token Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={handleInputChange('name')}
          error={errors.name}
        />
      </div>
      
      <div>
        <Label htmlFor="symbol">Symbol</Label>
        <Input
          id="symbol"
          value={formData.symbol}
          onChange={handleInputChange('symbol')}
          error={errors.symbol}
        />
      </div>
      
      <div>
        <Label htmlFor="initialSupply">Initial Supply</Label>
        <Input
          id="initialSupply"
          value={formData.initialSupply}
          onChange={handleInputChange('initialSupply')}
          error={errors.initialSupply}
        />
      </div>
      
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Token'}
      </Button>
    </Form>
  )
}
```

## Form Components

### Form Container

Basic form wrapper:

```typescript
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
}

export function Form({ children, ...props }: FormProps) {
  return (
    <form {...props} className="space-y-4">
      {children}
    </form>
  )
}
```

### Input Component

Input with error handling:

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <div>
      <input
        {...props}
        className={`input ${error ? 'input-error' : ''} ${className || ''}`}
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  )
}
```

### Label Component

Form labels:

```typescript
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
}

export function Label({ children, ...props }: LabelProps) {
  return (
    <label {...props} className="block text-sm font-medium mb-1">
      {children}
    </label>
  )
}
```

## Integration with GraphQL

Forms typically integrate with GraphQL mutations:

```typescript
import { useMutation } from '@tanstack/react-query'
import { graphql } from '../lib/graphql'

const CREATE_TOKEN_MUTATION = graphql(`
  mutation CreateToken($input: CreateTokenInput!) {
    createToken(input: $input) {
      id
      name
      symbol
      address
    }
  }
`)

export function useCreateToken() {
  return useMutation({
    mutationFn: async (input: CreateTokenInput) => {
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: CREATE_TOKEN_MUTATION,
          variables: { input }
        })
      })
      return response.json()
    }
  })
}
```

Use in form:

```typescript
export function TokenForm() {
  const createToken = useCreateToken()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    
    try {
      await createToken.mutateAsync(formData)
      // Handle success
    } catch (error) {
      // Handle error
    }
  }
  
  // ... rest of form logic
}
```

## Error Handling

### Validation Errors

Client-side validation for immediate feedback:

```typescript
const validateField = (field: string, value: string): string | undefined => {
  switch (field) {
    case 'name':
      return !value.trim() ? 'Name is required' : undefined
    case 'symbol':
      if (!value.trim()) return 'Symbol is required'
      if (value.length > 6) return 'Symbol must be 6 characters or less'
      return undefined
    case 'initialSupply':
      if (!value.trim()) return 'Initial supply is required'
      if (isNaN(Number(value))) return 'Must be a number'
      return undefined
    default:
      return undefined
  }
}
```

### Server Errors

Handle GraphQL errors:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  try {
    await createToken.mutateAsync(formData)
    onSuccess()
  } catch (error: any) {
    if (error.graphQLErrors) {
      // Handle GraphQL validation errors
      const fieldErrors = error.graphQLErrors
        .filter(err => err.extensions?.field)
        .reduce((acc, err) => ({
          ...acc,
          [err.extensions.field]: err.message
        }), {})
      
      setErrors(fieldErrors)
    } else {
      // Handle general errors
      setGeneralError(error.message || 'An error occurred')
    }
  }
}
```

## Form Patterns

### Reset Form

Clear form after successful submission:

```typescript
const resetForm = () => {
  setFormData({ name: '', symbol: '', initialSupply: '' })
  setErrors({})
}

const handleSubmit = async (e: React.FormEvent) => {
  // ... submission logic
  
  if (success) {
    resetForm()
  }
}
```

### Loading States

Show loading during submission:

```typescript
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Creating...' : 'Create Token'}
</Button>
```

### Form Validation

Validate on submit and optionally on blur:

```typescript
const handleBlur = (field: keyof FormData) => () => {
  const error = validateField(field, formData[field])
  setErrors(prev => ({ ...prev, [field]: error }))
}

<Input
  value={formData.name}
  onChange={handleInputChange('name')}
  onBlur={handleBlur('name')}
  error={errors.name}
/>
```

QuickDapp's form system keeps things simple while providing the essential functionality needed for user input and validation.