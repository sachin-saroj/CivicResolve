export function hasInvalidDateRange(dateFrom: string, dateTo: string) {
  return Boolean(dateFrom && dateTo && dateFrom > dateTo);
}

export function getAttachmentRecoveryMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Your grievance was saved, but the supporting document could not be uploaded.";
}
