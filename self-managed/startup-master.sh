#!/bin/bash

# Update system and install Git
sudo apt-get update -y
sudo apt-get install -y git

export HOME="/home/onukwilip"

cd ~

# Clone the repo
REPO_URL="https://github.com/onukwilip/online-auction-kubernetes.git"
CLONE_DIR="online-auction-kubernetes/self-managed"

git clone $REPO_URL

cd $CLONE_DIR

chmod +x ./common.sh
chmod +x ./master.sh

./common.sh

./master.sh