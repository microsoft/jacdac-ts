import { ApplicationInsights } from '@microsoft/applicationinsights-web'

const appInsights = new ApplicationInsights({
  config: {
    instrumentationKey: 'YOUR_INSTRUMENTATION_KEY_GOES_HERE',
    disableAjaxTracking: true,
    disableFetchTracking: true,
    disableCorrelationHeaders: true,
    enableSessionStorageBuffer: false,
    isStorageUseDisabled: true,
    isCookieUseDisabled: true,
  }
});

if (typeof window !== undefined) {
  appInsights.loadAppInsights();
  (window as any).appInsights = appInsights;
}

export default function useAnalytics() {
  return {
    page: () => appInsights.trackPageView(),
    track: (name: string, properties?: { [key: string]: any }) => appInsights.trackEvent({
      name, properties
    })
  }
}