

import clarindspace


def get_repository_collection(settings):
    repository = clarindspace.repository(settings["url"])
    repository.login(settings["user"], settings["password"])
    community = repository.find_or_create_community(settings["community"])
    return community.find_or_create_collection(settings["collection"])