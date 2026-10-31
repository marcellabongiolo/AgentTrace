/** Only the most recently started request may update dashboard selection state. */
export function isCurrentRequest(requestId: number, latestRequestId: number): boolean {
  return requestId === latestRequestId;
}
