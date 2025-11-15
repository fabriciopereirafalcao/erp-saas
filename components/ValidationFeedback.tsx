import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { ValidationResult, FieldValidation } from "../utils/fieldValidation";

interface ValidationFeedbackProps {
  validation: ValidationResult;
  title?: string;
  showFields?: boolean;
}

export function ValidationFeedback({ validation, title = "Validação", showFields = true }: ValidationFeedbackProps) {
  if (validation.isValid && validation.warnings.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-900">
          <strong>✅ {title}:</strong> Todos os campos estão válidos!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Erros */}
      {validation.errors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>❌ Erros encontrados:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              {validation.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Avisos */}
      {validation.warnings.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong>⚠️ Avisos:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              {validation.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Detalhes dos Campos */}
      {showFields && validation.fields.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm text-gray-900 mb-3">Status dos Campos:</h3>
          <div className="space-y-2">
            {validation.fields.map((field, idx) => (
              <FieldStatus key={idx} field={field} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function FieldStatus({ field }: { field: FieldValidation }) {
  const getIcon = () => {
    switch (field.type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getBadgeColor = () => {
    switch (field.type) {
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-lg border bg-white">
      <div className="flex items-center gap-2 flex-1">
        {getIcon()}
        <span className="text-sm text-gray-900">{field.label}</span>
        {field.required && (
          <Badge variant="outline" className="text-xs">Obrigatório</Badge>
        )}
      </div>
      <Badge variant="outline" className={`text-xs ${getBadgeColor()}`}>
        {field.message || (field.isValid ? 'OK' : 'Inválido')}
      </Badge>
    </div>
  );
}

/**
 * Componente inline para exibir status de validação de um campo individual
 */
interface FieldValidationIndicatorProps {
  isValid: boolean;
  message?: string;
  showSuccess?: boolean;
}

export function FieldValidationIndicator({ 
  isValid, 
  message, 
  showSuccess = true 
}: FieldValidationIndicatorProps) {
  if (isValid && !showSuccess) return null;

  return (
    <div className={`flex items-center gap-1 text-xs mt-1 ${isValid ? 'text-green-600' : 'text-red-600'}`}>
      {isValid ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <AlertCircle className="w-3 h-3" />
      )}
      {message && <span>{message}</span>}
    </div>
  );
}
