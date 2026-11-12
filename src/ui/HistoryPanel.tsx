import type { HistoryEvent } from '../sim/types';

interface HistoryPanelProps {
  history: HistoryEvent[];
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  return (
    <div class="history-panel">
      <h2>World History</h2>
      <div class="history-events">
        {history.map((event, index) => (
          <div key={index} class="history-event">
            <span class="history-year">{event.year}</span>
            <span class="history-description">{event.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
