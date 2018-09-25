# Installation of VIADAT

## Dependencies

- Python3
- LibreOffice (for document conversion)
- MongoDB


## Installation of backend

```
$ cd backend
$ pip3 install -r requirements.txt
```

## Creating an user account

```
# In VIADAT root directory
$ python3 -m backend create-user <USERNAME>
```


## Starting backend

Start MongoDB and then:

```
# In VIADAT root directory
$ python3 -m backend service
```

## Building a frontend

Setup hostname where backend runs in `web/src/config.js`.

The following commands build web application that should be statically served by a web server

```
$ cd web
$ npm install
$ npm run build
```

