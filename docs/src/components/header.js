import React from "react"
import PropTypes from "prop-types"
import ButtonAppBar from "./ButtonAppBar"

const Header = ({ siteTitle }) => <ButtonAppBar title={siteTitle} />
Header.propTypes = {
  siteTitle: PropTypes.string,
}

Header.defaultProps = {
  siteTitle: ``,
}

export default Header
