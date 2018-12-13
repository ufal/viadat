
import hashlib
import uuid

salt = b"A92RG9LJP9BN3V00L0RG71V70W908LEMVGV7NIQJDQJW3V1XDCR6GW8XHWFGOKV36WFCP"


def hash_password(password):
    return hashlib.sha512(password.encode() + salt).hexdigest()


def create_new_user(db, username, password):
    db["users"].insert({
        "username": username,
        "password": hash_password(password)
    })


def remove_user(db, username):
    db["users"].remove({
        "username": username,
    })


def reset_password(db, username, password):
    db["users"].update({"username": username},
                       {"password": hash_password(password)})


def login_user(db, username, password):
    user = db["users"].find_one({"username": username})
    if user and user["password"] == hash_password(password):
        token = str(uuid.uuid4().hex)
        db["users"].update_one({"username": username},
                               {"$set": {"token": token}})
        return token


def logout_user(db, username):
    db["users"].update_one({"username": username},
                           {"$set": {"token": None}})
