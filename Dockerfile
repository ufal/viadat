#            /-----\
# Docker for | DEV | version of Viadat
#            \-----/
#
# Make sure that repository.conf exists
# before building the docker image
# Format of repository.conf is described
# in docs/install.md

# run docker-compose up if the container is not built yet

# Web front end runs at port 3000
# There should be user "test" with password "test"


FROM ubuntu:18.04 as deps

RUN apt-get update && apt-get install -y \
    python3-pip \
    libreoffice \
    git \
    sox \
    libespeak-dev \
    ffmpeg \
    libsox-fmt-mp3

# numpy has to be explicitly installed before aeneas
RUN pip3 install numpy requests
RUN pip3 install aeneas

FROM deps

RUN git clone -b viadat --depth=1 https://github.com/ufal/pyclarindspace && \
    cd pyclarindspace && \
    python3 setup.py install

WORKDIR /viadat

# Hack, so Docker doesn't install npm/pip packages every time the image is rebuilt
# https://medium.com/@aidobreen/using-docker-dont-forget-to-use-build-caching-6e2b4f43771e

COPY /backend/requirements.txt /viadat/backend/requirements.txt
RUN cd /viadat/backend; pip3 install -r requirements.txt

COPY . /viadat

EXPOSE 5000

CMD (sleep 3 && python3 -m backend create-user test --password test) & (sleep 4 && flask run --host=0.0.0.0)
