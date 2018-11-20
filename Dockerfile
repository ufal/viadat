# Docker for *DEV* version of Viadat
# Make sure that repository.conf exists 
# before building the docker image

FROM ubuntu:18.04

RUN apt-get update && apt-get install -y \
    python3-pip \
    libespeak-dev \
    libreoffice \
    git \
    mongodb \
    nodejs \
    npm

RUN pip3 install requests numpy

RUN git clone --depth=1 https://github.com/ufal/pyclarindspace && \
    cd pyclarindspace && \
    python3 setup.py install

WORKDIR /viadat

COPY . /viadat

RUN cd backend && pip3 install -r requirements.txt


RUN cd web && npm install --no-optional

EXPOSE 3000
EXPOSE 5000

RUN mkdir /db

CMD mongod --dbpath=/db & (cd web && sh docker-start.sh && npm start) & (sleep 3 && python3 -m backend create-user test --password test) & (sleep 4 && python3 -m backend service)
