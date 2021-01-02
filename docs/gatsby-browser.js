exports.onRouteUpdate = ({ location }, options) => {
  if (typeof window !== 'undefined' && window.analytics) {
    window.analytics.page();
  }
}