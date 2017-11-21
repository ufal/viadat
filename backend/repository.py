

import clarindspace


def get_repository_collection(settings):
    repository = clarindspace.repository(settings["url"])
    repository.login(settings["user"], settings["password"])
    community = repository.find_or_create_community(settings["community"])
    return community.find_or_create_collection(settings["collection"])

"""
def test_login_and_create():
    settings = {
        "url": "https://ufal-point-dev.ms.mff.cuni.cz/viadat-repo/",
        "user": "demo@ufal-point-dev.ms.mff.cuni.cz",
        "password": "***REMOVED***",
        "community": "export-test1",
        "collection": "testcol"
    }
    collection = get_repository_collection(settings)

    item = [
            {"key": "dc.title", "value": "Test title", "language": None},
            #{"key": "viadata.narrator", "value": "Test narrator", "language": None},
    ]
    collection.create_item(item)

#test_login_and_create()
"""