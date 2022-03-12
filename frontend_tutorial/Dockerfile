FROM ubuntu:20.04
ENV PYTHONUNBUFFERED 1
RUN mkdir /code
WORKDIR /code
COPY requirements.txt /code/
RUN apt-get update && apt-get install -y \
    python3-pip \
    libpq-dev
RUN pip install -r requirements.txt
COPY . /code/
