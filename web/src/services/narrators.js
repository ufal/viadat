import {call_service, call_service_json} from "./utils";

export function fetch_narrators() {
    return call_service_json("narrators");
}

export function fetch_ready_narrators() {
    return call_service_json('narrators?where={"metadata.status": "r"}');
}

export function fetch_published_narrators() {
    return call_service_json('narrators?where={"metadata.status": "p"}');
}

export function fetch_narrator(id) {
    return call_service_json("narrators/" + id)
}

export function update_narrator(narrator, update) {
    return call_service("narrators/" + narrator._id, update, "PATCH", narrator._etag)
}

export function create_narrator(narrator) {
    return call_service_json("narrators", narrator);
}
