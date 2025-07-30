#!/bin/bash

# Install docker first
# Before running this script
# Create a repo in ecr
# After creating repo in ecr you can check the account in push commands, it should be same, but check it anyway

region="us-east-1"
reponame="nodejs/server"
account="public.ecr.aws/d7g8v4v5"

aws ecr-public get-login-password --region "$region" | docker login --username AWS --password-stdin "$account"
docker build --platform=linux/amd64 -t "$reponame" ./fargate-image
docker tag "$reponame:latest" "$account/$reponame:latest"
docker push "$account/$reponame:latest"
