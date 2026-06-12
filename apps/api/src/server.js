import http from "node:http";
import { routeRequest } from "./routes/router.js";
import { loadRootEnv } from "./services/envService.js";

loadRootEnv();

const port = Number(process.env.API_PORT || 8787);

const server = http.createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const result = await routeRequest(request);
    sendJson(response, result.status, result.body);
  } catch (error) {
    sendJson(response, 400, {
      error: error.message || "Unexpected API error"
    });
  }
});

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(body, null, 2));
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
