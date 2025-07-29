FROM node:22-alpine

RUN apk add --no-cache curl unzip bash sudo aws-cli

WORKDIR /usr/src/app

# ENV AWS_ACCESS_KEY_ID=
# ENV AWS_SECRET_ACCESS_KEY=
# ENV AWS_REGION=

# Copy and run init script
COPY init.sh /usr/local/bin/init.sh
RUN chmod +x /usr/local/bin/init.sh

EXPOSE 80
# EXPOSE 443

ENTRYPOINT ["/usr/local/bin/init.sh"]
