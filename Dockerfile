FROM node:12-bullseye-slim AS build

COPY package* /app/
WORKDIR /app
RUN npm i
COPY . /app/
RUN npm run build


FROM node:12-bullseye-slim
COPY package* /app/
WORKDIR /app
RUN npm i --only=prod && npm cache clean --force

COPY . /app/
COPY --from=build /app/dist /app/dist

CMD ["node", "dist/app.js", "--ws=ws://127.0.0.1:3501/", "--num=10", "--keep", "--flag=JOLLY", "--character=Tornado"]
