exports.onRouteUpdate = ({ location }, options) => {
    if (typeof window !== 'undefined' && window.appInsights) {
      window.appInsights.trackPageView();
    }
  }