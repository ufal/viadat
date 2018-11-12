import {
  call_service,
  call_service_json,
  call_service_text,
  call_raw_service
} from "./utils.js";

export function fetch_entries() {
  return call_service_json("entries");
}

export function fetch_entry(entry_id) {
  return call_service_json("entries/" + entry_id);
}

export function create_entry(entry) {
  return call_service_json("entries", entry);
}

export function remove_entry(entry) {
  return call_service("entries/" + entry._id, entry, "DELETE", entry._etag);
}

export function upload_source_files(source_id, files) {
  var data = new FormData();
  for (let f of files) {
    data.append("file", f);
  }
  return call_raw_service("upload/" + source_id, data);
}

export function upload_at_files(entry_id, files) {
  var data = new FormData();
  for (let f of files) {
    data.append("file", f);
  }
  return call_raw_service("upload-at/" + entry_id, data);
}

export function fetch_sources(entry_id) {
  return call_service_json('sources?where={"entry": "' + entry_id + '"}');
}

export function fetch_source(item_id) {
  return call_service_json("sources/" + item_id);
}

export function create_source(source) {
  return call_service_json("sources", source);
}

export function remove_source(source) {
  return call_service("sources/" + source._id, source, "DELETE", source._etag);
}

export function autodetect_source_metadata(source_id) {
  return call_service_json("sources/" + source_id + "/autodetect");
}

export function update_source(source, update) {
  return call_service("sources/" + source._id, update, "PATCH", source._etag);
}

export function fetch_ready_sources() {
  return call_service_json('sources?where={"metadata.status": "r"}');
}

export function run_export() {
  return call_raw_service("export", {});
}

export function fetch_groups(entry_id) {
  return call_service_json('groups?where={"entry": "' + entry_id + '"}');
}

export function fetch_transcripts(group_id) {
  return call_service_json('transcripts?where={"group": "' + group_id + '"}');
}

export function create_transcription(source_id) {
  return call_raw_service("create-at/" + source_id);
}

export function fetch_transcript(transcript_id) {
  return call_service_json(
    "transcripts/" + transcript_id + '?embedded={"group": 1}'
  );
}

export function fetch_transcript_content(transcript) {
  return call_service_text("download/" + transcript.uuid);
}

export function fetch_ready_groups() {
  return call_service_json('groups?where={"metadata.status": "r"}');
}

export function update_group(item, update) {
  return call_service("groups/" + item._id, update, "PATCH", item._etag);
}

export function remove_group(group) {
  return call_service("groups/" + group._id, group, "DELETE", group._etag);
}
