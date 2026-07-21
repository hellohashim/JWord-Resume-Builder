FROM node:22-bookworm

# Install a full TeX Live distribution
RUN apt-get update && \
    apt-get install -y \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-lang-english \
    lmodern \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /opt/render/project/src

# Install backend dependencies
COPY server/package*.json ./server/
WORKDIR /opt/render/project/src/server
RUN npm install

# Copy project
WORKDIR /opt/render/project/src
COPY . .

WORKDIR /opt/render/project/src/server

CMD ["npm", "start"]