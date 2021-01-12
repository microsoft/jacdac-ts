import Layout from "./src/components/layout"

export const onRouteUpdate = ({ location }, options) => {
  window.analytics.page();
}

export const wrapPageElement = Layout