# VOXEL slicing service - builds CuraEngine from source (no prebuilt
# standalone binary exists) and serves a /slice HTTP endpoint.
#
# NOTE: this build was NOT test-completed in the environment that wrote
# it - Conan's package server (center.conan.io) was unreachable from
# that sandbox. It should build fine on Render (normal outbound
# internet), but expect this to need at least one debug round if a step
# fails - send the Render build-log screenshot when that happens.

FROM ubuntu:24.04 AS builder

RUN apt-get update && apt-get install -y \
    build-essential cmake ninja-build git python3 python3-pip pipx curl \
    && rm -rf /var/lib/apt/lists/*

RUN pipx install conan==2.7.1 && pipx ensurepath
ENV PATH="/root/.local/bin:${PATH}"

# This registers Ultimaker's own Conan remote/config (needed for
# CuraEngine's internal "sentrylibrary" python_requires dependency,
# which isn't on the public Conan Center) - missing this step is what
# caused the first build attempt to fail.
RUN conan config install https://github.com/ultimaker/conan-config.git
RUN conan profile detect --force

# --- Build CuraEngine ---
WORKDIR /opt
RUN git clone --depth 1 https://github.com/Ultimaker/CuraEngine.git
WORKDIR /opt/CuraEngine
RUN conan install . --build=missing -s build_type=Release
RUN cmake --preset conan-release
RUN cmake --build --preset conan-release

# --- Grab the machine/material definition files CuraEngine needs at slice time ---
# (These live in Cura's repo, not CuraEngine's - sparse checkout to avoid
# pulling the whole (large) Cura desktop app source.)
WORKDIR /opt
RUN git clone --depth 1 --filter=blob:none --sparse https://github.com/Ultimaker/Cura.git cura-src && \
    cd cura-src && git sparse-checkout set resources/definitions resources/extruders
RUN mkdir -p /opt/cura-definitions && \
    cp /opt/cura-src/resources/definitions/fdmprinter.def.json /opt/cura-definitions/ && \
    cp /opt/cura-src/resources/extruders/fdmextruder.def.json /opt/cura-definitions/

# --- Runtime image ---
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y nodejs npm python3 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/CuraEngine/build /opt/CuraEngine/build
COPY --from=builder /opt/cura-definitions /opt/cura-definitions

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY scripts ./scripts
COPY profiles ./profiles

ENV CURA_ENGINE_BIN=/opt/CuraEngine/build/CuraEngine
ENV CURA_DEFS_DIR=/opt/cura-definitions
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
