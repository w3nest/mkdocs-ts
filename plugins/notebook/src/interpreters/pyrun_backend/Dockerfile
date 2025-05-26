ARG python="3.12"
FROM python:${python}-slim

ARG modules=""
ARG apt=""

RUN echo "Installing additional apt packages: ${apt}" && if [ -n "${apt}" ]; then apt-get update && apt-get install -y ${apt}; fi

WORKDIR /opt/app

RUN useradd --uid 10000 --create-home app && mkdir /opt/app/deps
COPY /deps/*.whl /opt/app/deps
COPY /dist/pyrun_backend-*.whl /opt/app

RUN pip3 install --no-cache-dir /opt/app/pyrun_backend-*.whl --find-links /opt/app/deps && \
    rm /opt/app/pyrun_backend-*.whl && rm /opt/app/deps/*.whl

RUN echo "Installing additional modules: ${modules}" && if [ -n "${modules}" ]; then pip3 install ${modules}; fi

USER 10000
EXPOSE 8080

ENTRYPOINT ["run_pyrun_backend"]
