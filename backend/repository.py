from clarindspace.viadat import ViadatRepo


def get_logged_in_instance(settings):
    repository = ViadatRepo(settings["url"])
    repository.login(settings["user"], settings["password"])
    return repository
