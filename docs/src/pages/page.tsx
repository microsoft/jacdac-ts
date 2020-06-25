import React, { useState } from "react"
import { Typography } from "@material-ui/core";
import { Link, Button } from "gatsby-theme-material-ui";

const Page = () => {
  const [counter, setCounter] = useState(0);
  return <div>
    <Typography>
      Check out my <Link to="/blog">blog</Link>!
      <Button onClick={() => setCounter(counter + 1)}>Counter {counter}</Button>
    </Typography>
  </div>
}

export default Page;