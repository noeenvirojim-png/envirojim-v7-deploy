import * as React from "react"
import { useFormStatus, useFormState } from "react-dom"
import { useForm, FormProvider, useFormContext, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface FormState {
    success?: boolean
    error?: string
    message?: string
}

// Existing simple Form
interface FormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'action'> {
    action: (formData: FormData) => Promise<FormState | void>
    submitText?: string
    loadingText?: string
    successMessage?: string
    className?: string
}

export function Form({
    action,
    children,
    submitText = "Submit",
    loadingText = "Processing...",
    successMessage,
    className,
    ...props
}: FormProps) {
    // @ts-ignore useFormState is available in newer React/Next versions
    const [state, formAction] = useFormState(
        async (prevState: FormState, formData: FormData) => {
            try {
                const result = await action(formData)
                return (result || {}) as FormState
            } catch (e) {
                return { success: false, error: "An unexpected error occurred" }
            }
        },
        {}
    )

    return (
        <form action={formAction} className={cn("space-y-6", className)} {...props}>
            {state.error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {state.error}
                </div>
            )}

            {state.success && (successMessage || state.message) && (
                <div className="rounded-md bg-success/15 p-3 text-sm text-success flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {successMessage || state.message}
                </div>
            )}

            {children}

            <SubmitButton submitText={submitText} loadingText={loadingText} />
        </form>
    )
}

function SubmitButton({ submitText, loadingText }: { submitText: string, loadingText: string }) {
    const { pending } = useFormStatus()

    return (
        <Button
            type="submit"
            disabled={pending}
            className="w-full"
            variant="industrial"
        >
            {pending ? (
                <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {loadingText}
                </>
            ) : (
                submitText
            )}
        </Button>
    )
}

// New RHF-based components for LoginForm
interface FormWrapperProps {
    schema: any
    onSubmit: (values: any) => void
    children: (methods: any) => React.ReactNode
    className?: string
    defaultValues?: any
}

export function FormWrapper({ schema, onSubmit, children, className, defaultValues }: FormWrapperProps) {
    const methods = useForm({
        resolver: zodResolver(schema),
        defaultValues
    })

    return (
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className={className}>
                {children(methods)}
            </form>
        </FormProvider>
    )
}

interface FormFieldProps {
    name: string
    label?: string
    render: (field: any) => React.ReactNode
}

export function FormField({ name, label, render }: FormFieldProps) {
    const { control, formState: { errors } } = useFormContext()
    const error = errors[name]?.message as string

    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <div className="space-y-2">
                    {label && <Label htmlFor={name} className="text-slate-200">{label}</Label>}
                    {render(field)}
                    {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
            )}
        />
    )
}
