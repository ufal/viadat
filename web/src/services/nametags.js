import { call_service_json } from './utils.js';


export function fetch_all_nametags() {
    return call_service_json("nametags/all");
}

export function fetch_nametag(tagtype) {
    //return call_service_json("nametags?embedded={\"items\":1}")
    return call_service_json("nametags?where={\"type\": \"" + tagtype + '"}&embedded={"items":1, "items.entry_id": 1}&max_results=200&sort=[("value", 1)]')
}