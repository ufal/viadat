import lxml.etree as et


def remove_and_preserve_tail(element):
    parent = element.getparent()
    if element.tail:
        prev = element.getprevious()
        if prev:
            if prev.tail:
                prev.tail += element.tail
            else:
                prev.tail = element.tail
        else:
            if parent.text:
                parent.text += element.tail
            else:
                parent.text = element.tail
    parent.remove(element)


def element_to_text(element):
    buf = [element.text]
    for child in element:
        buf.append(element_to_text(child))
        buf.append(child.tail)
    return "".join(b for b in buf if b is not None)


def elements_to_text(elements):
    buf = []
    for child in elements:
        buf.append(element_to_text(child))
        buf.append(child.tail)
    return "".join(b for b in buf if b is not None)


def clone_element(element):
    """Creates a copy of element without childs"""
    e = et.Element(element.tag)
    e.text = element.text
    e.tail = element.tail
    for k in element.attrib:
        e.set(k, element.attrib[k])
    return e


def traverse(element, fn):
    fn(element)
    for child in element:
        traverse(child, fn)


def traverse_map(element, fn):
    r = fn(element)
    if r is not None:
        return r
    if len(element) == 0:
        return element
    e = clone_element(element)
    for child in element:
        e.append(traverse_map(child, fn))
    return e


def to_json(element):

    childs = []

    for e in element:
        childs.append(to_json(e))
        if e.tail:
            childs.append(e.tail)

    if element.text:
        childs.append(element.text)

    result = dict(element.attrib)

    result["_tag"] = element.tag
    result["_childs"] = childs

    return result
