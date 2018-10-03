import { call_service_json } from './utils.js';


export function fetch_search(text) {
  return call_service_json("lemmatize?q=" + text).then(r => {
    return call_service_json("lemmas?where=" + JSON.stringify({"value" : {"$in": r}}) + '&embedded={"transcripts":1}').then(r2 => {
      let occurences = {};
      let items = {};
      for (let lemma of r2._items) {
        for (let item of lemma.transcripts) {
          let v = occurences[item._id];
          if (!v) {
            items[item._id] = item;
            occurences[item._id] = 0;
          }
          occurences[item._id] += 1;
        }
      }
      let sorted = Object.keys(occurences).sort((a,b) => occurences[a]-occurences[b]);

      let results = []
      for(let id of sorted) {
        results.push(items[id]);
      }
      return {results: results, lemmas: r};
    })
  });
}