import { call_service_json, call_service } from './utils.js';


export function create_labelcategory(category) {
    return call_service_json("labelcategories", category);
}

export function create_labelinstance(label_instance) {
    return call_service_json("labelinstances", label_instance);
}

export function create_label(label) {
    return call_service_json("labels", label);
}

export function update_label(label, changes) {
    return call_service("labels/" + label._id, changes, "PATCH", label._etag);
}

export function fetch_label(id) {
    return call_service_json("labels/" + id);
}

export function fetch_labelcategories() {
    return call_service_json("labelcategories");
}

export function fetch_labels() {
    return call_service_json("labels");
}

export function remove_label(label) {
    return call_service("labels/" + label._id, label, "DELETE", label._etag);
}

export function fetch_labelinstances(transcript_id) {
    return call_service_json('labelinstances?where={"transcript": "' + transcript_id + '"}&embedded={"label": 1}')
}

export function delete_labelinstance(labelinstance) {
    return call_service('labelinstances/' + labelinstance._id, labelinstance, "DELETE", labelinstance._etag);
}

export function fetch_labelinstances_of_label(label) {
    return call_service_json('labelinstances?where={"label": "' + label + '"}&embedded={"transcript": 1, "item.entry_id": 1}')
}