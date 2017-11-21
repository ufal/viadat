export function map_elements(root, name, fn) {
    return root._childs.filter((o) => o._tag === name).map(fn);
}

export function traverse_elements(root, name, fn) {
    if (root._tag === name) {
        fn(root);
    }
    if (root._childs) {
        for (let e of root._childs) {
            traverse_elements(e, name, fn);
        }
    }
}

export function find_elements(root, name) {
    let results = [];
    traverse_elements(root, name, (e => results.push(e)));
    return results;
}

export function element_to_text(element) {
    if (typeof element === 'string') {
        return element;
    }
    return element._childs.map(element_to_text).join("");
}

export function element_childs(element, name) {
    return element._childs.filter((o) => o._tag === name)
}