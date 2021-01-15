import Layout from "./src/components/layout"
import React from 'react'
import ReactDOM from 'react-dom'
import reactAxe from "@axe-core/react"

export const onRouteUpdate = ({ location }, options) => {
  window.analytics.page();
}

export const wrapPageElement = Layout

const activeEnv = process.env.GATSBY_ACTIVE_ENV || process.env.NODE_ENV || 'development'
const isDev = activeEnv === 'development'

export const onInitialClientRender = () => {
  if (isDev) {
    reactAxe(React, ReactDOM, 1000, {})
  }
}