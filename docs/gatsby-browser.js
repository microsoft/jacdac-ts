exports.onRouteUpdate = ({ location }, options) => {
  console.log('onrouteupdate')
  window.analytics.page();
}