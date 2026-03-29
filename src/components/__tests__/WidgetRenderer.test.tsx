import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import WidgetRenderer from '../WidgetRenderer';

const widget = {
  id: 'widget-1',
  widget_type: 'metric_gauge',
  title: 'Daily Steps',
  position_x: 0,
  position_y: 0,
  width: 3,
  height: 3,
  config: {},
  data_sources: [],
  refresh_interval: 60,
};

describe('WidgetRenderer', () => {
  it('shows planned widgets as a non-live roadmap state', () => {
    render(
      <WidgetRenderer
        widget={{ ...widget, widget_type: 'training_load', title: 'Training Load' }}
        payload={{ status: 'planned', error: 'This widget is planned and is not available yet.' }}
      />,
    );

    expect(screen.getByText(/planned and is not available yet/i)).toBeInTheDocument();
  });

  it('renders backend-fed gauge data without relying on local mock generation', () => {
    render(
      <WidgetRenderer
        widget={widget}
        payload={{
          status: 'ready',
          data: {
            value: 8421,
            goal: 10000,
            label: 'Steps',
            unit: 'steps',
          },
        }}
      />,
    );

    expect(screen.getByText('8421')).toBeInTheDocument();
    expect(screen.getByText('Steps')).toBeInTheDocument();
    expect(screen.getByText('steps')).toBeInTheDocument();
  });
});
