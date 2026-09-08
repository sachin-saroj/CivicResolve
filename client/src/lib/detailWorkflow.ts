export function resolveDetailMutationId(detail: { grievance?: { id?: number } } | undefined, fallbackId: number) {
  return detail?.grievance?.id ?? fallbackId;
}

export function invalidateDetailCaches(utils: any, resolvedId: number, trackingNumber?: string) {
  void utils.grievances.detail.invalidate({ grievanceId: resolvedId });
  if (trackingNumber) void utils.grievances.detailByTracking.invalidate({ trackingNumber });
}

export function createStaffMutationPlan(utils: any, detail: { grievance?: { id?: number } } | undefined, fallbackId: number, trackingNumber?: string) {
  const grievanceId = resolveDetailMutationId(detail, fallbackId);
  return { grievanceId, onSuccess: () => invalidateDetailCaches(utils, grievanceId, trackingNumber) };
}
