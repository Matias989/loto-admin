const leaderFlowState = new Map();

const TTL = 5 * 60 * 1000;

export function setLeaderState(userId, data) {
  leaderFlowState.set(userId, { ...data, ts: Date.now() });
}

export function getLeaderState(userId) {
  const s = leaderFlowState.get(userId);
  if (!s) return null;
  if (Date.now() - s.ts > TTL) {
    leaderFlowState.delete(userId);
    return null;
  }
  return s;
}

export function clearLeaderState(userId) {
  leaderFlowState.delete(userId);
}
