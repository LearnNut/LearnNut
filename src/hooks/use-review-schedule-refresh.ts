import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const MAX_TIMER_DELAY_MS = 2_147_000_000;
const DUE_BOUNDARY_BUFFER_MS = 50;

export function useReviewScheduleRefresh(dueAtValues: readonly string[]) {
  const dueAtKey = dueAtValues.join('|');
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setRefreshTick((currentTick) => currentTick + 1);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const now = Date.now();
    const nextDueAt = dueAtKey
      .split('|')
      .map((value) => Date.parse(value))
      .filter((value) => Number.isFinite(value) && value > now)
      .sort((left, right) => left - right)[0];

    if (nextDueAt === undefined) {
      return;
    }

    const delay = Math.min(
      nextDueAt - now + DUE_BOUNDARY_BUFFER_MS,
      MAX_TIMER_DELAY_MS,
    );
    const timeout = setTimeout(() => {
      setRefreshTick((currentTick) => currentTick + 1);
    }, delay);

    return () => clearTimeout(timeout);
  }, [dueAtKey, refreshTick]);

  return refreshTick;
}
