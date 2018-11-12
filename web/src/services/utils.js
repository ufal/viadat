import { SERVER_URL } from "../config.js";

export let AuthData = {
  username: null,
  token: null
};

export function call_service(
  link,
  body,
  method,
  etag
) {
  let content_type;
  if (body) {
    content_type = "application/json";
  }
  return call_raw_service(
    link,
    body ? JSON.stringify(body) : null,
    content_type,
    method,
    etag
  );
}

export function call_raw_service(link, body, content_type, method, etag) {
  if (!method) {
    if (body) {
      method = "POST";
    } else {
      method = "GET";
    }
  }

  let headers = {};

  if (etag) {
    headers["If-Match"] = etag;
  }

  if (AuthData.token) {
    headers["Authorization"] = AuthData.token;
  }

  if (content_type) {
    headers["Content-Type"] = "application/json";
  }

  if (body) {
    return fetch(SERVER_URL + link, {
      mode: "cors",
      headers: headers,
      method: method,
      body: body
    });
  } else {
    return fetch(SERVER_URL + link, {
      method: method,
      headers: headers,
      mode: "cors"
    });
  }
}

export function call_service_json(link, body, method, etag) {
  return call_service(link, body, method, etag).then(response => {
    if (response.ok) {
      return response.json();
    } else {
      return Promise.reject(response);
    }
  });
}

export function call_service_text(link, body, method) {
  return call_service(link, body, method).then(response => {
    return response.text();
  });
}
