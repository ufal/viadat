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


RUN cd web && npm install

EXPOSE 3000
EXPOSE 5000

CMD mongod & (cd web && npm start) & python3 -m backend service & (sleep 2 && python3 -m backend create-user test --password test)
