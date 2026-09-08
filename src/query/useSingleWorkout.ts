import { useMutation, useMutationState, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import type { CalendarEvent, SingleWorkoutPreview, PlannedWorkoutReplacementCategory } from '@/api/types';
import { formatIsoDay, initialCalendarWindow, type DateWindow } from '@/domain/calendarWindows';
import { queryKeys } from './keys';

function previewCalendarEvent(preview: SingleWorkoutPreview, id: string): CalendarEvent {
  const { workout, category } = preview;
  return {
    id,
    type: 'planned',
    category: category === 'quality' ? 'interval' : category === 'club' ? 'other' : category,
    date: new Date(workout.startDateLocal),
    name: workout.name,
    description: workout.description,
    duration: workout.metrics.duration == null ? undefined : workout.metrics.duration.minutes * 60,
    distance: workout.metrics.distance == null ? undefined : workout.metrics.distance.km * 1000,
    fuelRate: workout.metrics.fuelRateGPerHour,
    prescribedCarbsG: workout.metrics.prescribedCarbsG,
  };
}

export function usePendingWorkoutCreations() {
  const { session } = useAuth();
  const pending = useMutationState({
    filters: { mutationKey: queryKeys.createWorkout(session?.email ?? ''), status: 'pending' },
    select: (mutation) => ({
      preview: mutation.state.variables as SingleWorkoutPreview,
      id: `pending-workout-${mutation.mutationId}`,
    }),
  });
  return useMemo(() => pending.map(({ preview, id }) => previewCalendarEvent(preview, id)), [pending]);
}

export function useSingleWorkoutPreview(date: string, category?: PlannedWorkoutReplacementCategory) {
  const client = useApiClient();
  const { status, session } = useAuth();
  return useQuery({
    queryKey: queryKeys.singleWorkoutPreview(session?.email ?? '', date, category),
    queryFn: () => client.previewWorkout(date, category),
    enabled: status === 'signedIn' && session != null,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateWorkout() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const identity = session?.email ?? '';
  const calendarKey = queryKeys.calendar(identity);
  return useMutation({
    mutationKey: queryKeys.createWorkout(identity),
    networkMode: 'always',
    retry: false,
    mutationFn: ({ date, category, previewHash }: SingleWorkoutPreview) =>
      client.createWorkout({ date, category, previewHash }),
    onSuccess: async ({ newId }, preview) => {
      await queryClient.cancelQueries({ queryKey: calendarKey });
      // A sign-out may have removed this cache while the request was in flight.
      if (!queryClient.getQueryState(calendarKey)) return;
      const event = previewCalendarEvent(preview, `event-${newId}`);
      queryClient.setQueryData<InfiniteData<CalendarEvent[], DateWindow>>(calendarKey, (current) => {
        const pages = current?.pages.map((page) => page.filter((item) => item.id !== event.id)) ?? [[]];
        const pageParams = current?.pageParams.map((window) => ({ ...window })) ?? [initialCalendarWindow(event.date)];
        const day = formatIsoDay(event.date);
        let index = pageParams.findIndex((window) => window.oldest <= day && window.newest >= day);
        if (index === -1) {
          index = day < pageParams[0].oldest ? 0 : pageParams.length - 1;
          pageParams[index].oldest = day < pageParams[index].oldest ? day : pageParams[index].oldest;
          pageParams[index].newest = day > pageParams[index].newest ? day : pageParams[index].newest;
        }
        pages[index].push(event);
        return { pages, pageParams };
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plannedWorkout(identity, event.id) });
      void queryClient.invalidateQueries({ queryKey: calendarKey, refetchType: 'none' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.planner(identity) });
    },
  });
}
