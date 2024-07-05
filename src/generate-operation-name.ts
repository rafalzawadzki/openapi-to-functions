const MAX_FUNCTION_NAME_LENGTH_ALLOWED_BY_OPENAI = 64;

export function generateOperationName(operation: any, path: string, method: string): string {
  if (operation.operationId) {
    return operation.operationId.slice(0, MAX_FUNCTION_NAME_LENGTH_ALLOWED_BY_OPENAI);
  }
  const sanitizedPath = path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const generatedName = `${method.toLowerCase()}_${sanitizedPath}`;
  return generatedName.slice(0, MAX_FUNCTION_NAME_LENGTH_ALLOWED_BY_OPENAI);
}
