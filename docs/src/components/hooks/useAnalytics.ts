import { ApplicationInsights, IPageViewTelemetry, IEventTelemetry } from '@microsoft/applicationinsights-web-basic'
import { useCallback } from 'react';

const appInsights = new ApplicationInsights({
  instrumentationKey: 'YOUR_INSTRUMENTATION_KEY_GOES_HERE',
});
const page = typeof window !== "undefined"
  ? () => appInsights.track({
    name: window.location.href,
    time: new Date().toUTCString(),
    baseType: "PageData"
  })
  : () => { };
const track = (name: string, properties?: { [key: string]: any }) => appInsights.track({
  name,
  time: new Date().toUTCString(),
  data: properties,
  baseType: "EventData"
});
if (typeof window !== undefined) {
  (window as any).analytics = {
    page, track
  }
}

export default function useAnalytics() {
  return {
    page,
    track
  }
}