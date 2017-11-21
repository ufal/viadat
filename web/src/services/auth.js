import { call_service_json, AuthData } from './utils.js';

export function auth_login(username, password) {
    return call_service_json("login/", {
        username: username,
        password: password
    }).then((token) => {
        AuthData.username = username;
        AuthData.token = token;
        sessionStorage.setItem("authUsername", username);
        sessionStorage.setItem("authToken", token);
    });
}

export function try_load_auth_data() {
    if (sessionStorage.getItem("authUsername")) {
        AuthData.username = sessionStorage.getItem("authUsername");
        AuthData.token = sessionStorage.getItem("authToken");
    }
}

