// creates the Express app, plugs in the middleware, plugs in the routes, and starts the server.

require("dotenv").config(); // load the .env values before anything
const express = require("express");
const rateLimiter = require("./src/rateLimiter");
const routes = require("./src/routes");

const app = express(); // create the express app
app.use(express.json()); // pares JSON request bodies
app.use(rateLimiter); // apply rate limiting to every request
app.use(routes); // register all the routes

// Start listening for requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
