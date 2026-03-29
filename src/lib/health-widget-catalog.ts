export type WidgetCatalogStatus = 'live' | 'planned';

export const WIDGET_CATALOG_STATUS: Record<string, WidgetCatalogStatus> = {
  glucose_trend: 'live',
  glucose_stats: 'live',
  heart_rate_zones: 'live',
  hrv_trend: 'live',
  sleep_stages: 'live',
  sleep_score: 'live',
  activity_summary: 'live',
  health_summary: 'live',
  metric_gauge: 'live',
  deep_dive_insight: 'live',
  training_load: 'planned',
  vo2_max_trend: 'planned',
  correlation_chart: 'planned',
  multi_metric_timeline: 'planned',
  recovery_score: 'planned',
  strain_recovery: 'planned',
};

export function getWidgetCatalogStatus(widgetType: string): WidgetCatalogStatus {
  return WIDGET_CATALOG_STATUS[widgetType] || 'planned';
}
