interface PrismaClientErrorStructure {
  code: string;
  meta?: Record<string, unknown>;
  message: string;
}

export const isPrismaClientExceptionWithCode = (
  error: unknown,
  targetCode: string,
): error is PrismaClientErrorStructure => {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string' &&
    (error as Record<string, unknown>).code === targetCode
  );
};
