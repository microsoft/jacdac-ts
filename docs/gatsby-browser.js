import Layout from "./src/components/layout"

export const onRouteUpdate = ({ location }, options) => {
  console.log('onrouteupdate')
  window.analytics.page();
}

export const wrapPageElement = Layout