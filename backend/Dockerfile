FROM ubuntu:20.04
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH "${PYTHONPATH}:/code"
RUN mkdir /code
WORKDIR /code
COPY requirements.txt /code/
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/London
RUN apt-get update && apt-get install -y \
    libpq-dev \
    python-dev \
    tzdata \
    python3-pip \
    gdal-bin
RUN pip install -r requirements.txt
COPY . /code/
