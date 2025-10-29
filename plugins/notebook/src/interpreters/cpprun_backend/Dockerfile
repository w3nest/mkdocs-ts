# ----------------------------
# Base Python image
# ----------------------------
ARG python="3.12"
FROM python:${python}-slim

# ----------------------------
# Rarely changing dependencies
# ----------------------------
# Install Cling dependencies and basic tools
RUN apt-get update && apt-get install -y \
    clang \
    cmake \
    libstdc++6 \
    wget \
    unzip \
    git \
    bzip2 \
    nlohmann-json3-dev \
    && rm -rf /var/lib/apt/lists/*

# Download and extract Cling precompiled binary for Ubuntu 20.04
RUN wget https://root.cern/download/cling/cling_2020-11-05_ROOT-ubuntu2004.tar.bz2 -O /tmp/cling.tar.bz2 && \
    tar -xjf /tmp/cling.tar.bz2 -C /opt && \
    rm /tmp/cling.tar.bz2

# Add Cling to PATH
ENV PATH="/opt/cling_2020-11-05_ROOT-ubuntu2004/bin:${PATH}"

# ----------------------------
# Working directory and user
# ----------------------------
WORKDIR /opt/app
RUN useradd --uid 10000 --create-home app && mkdir /opt/app/deps

# ----------------------------
# Python backend
# ----------------------------
COPY /deps/*.whl /opt/app/deps
COPY /dist/cpprun_backend-*.whl /opt/app

# Install backend Python wheel
RUN pip3 install --no-cache-dir /opt/app/cpprun_backend-*.whl --find-links /opt/app/deps && \
   rm /opt/app/cpprun_backend-*.whl && rm /opt/app/deps/*.whl

# ----------------------------
# Frequently changing layer
# ----------------------------
ARG apt=""

# Install additional C++ libraries (apt) if specified
RUN echo "Installing extra apt packages: ${apt}" && \
    if [ -n "${apt}" ]; then apt-get update && apt-get install -y ${apt} && rm -rf /var/lib/apt/lists/*; fi

USER 10000

# ----------------------------
# Expose FastAPI port
# ----------------------------
EXPOSE 8080

# ----------------------------
# Entrypoint
# ----------------------------
ENTRYPOINT ["run_cpprun_backend"]
