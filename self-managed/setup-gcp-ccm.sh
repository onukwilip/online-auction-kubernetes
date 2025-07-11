#!/bin/bash
set -e

# PROJECT_ID="kubernetes-practice-462208"
# ZONE="us-central1-a"
# MASTER_NODE="k8s-master-node"
# WORKER_NODES=("k8s-worker-node")

echo "Inside Script"

echo "PROJECT_ID: $PROJECT_ID"
echo "ZONE: $ZONE"
echo "MASTER_NODE: $MASTER_NODE"
echo "WORKER_NODES: $WORKER_NODES"

CLUSTER_CIDR="192.168.0.0/16"
MASTER_INTERNAL_IP=$(gcloud compute instances describe $MASTER_NODE --zone=$ZONE --format='get(networkInterfaces[0].networkIP)')

# sudo apt install yq -y

sudo wget -qO /usr/local/bin/yq \
https://github.com/mikefarah/yq/releases/download/v4.46.1/yq_linux_amd64
sudo chmod +x /usr/local/bin/yq

# * 1. Patch Master Node
echo "🔧 Patching providerID for Master Node..."
kubectl patch node $MASTER_NODE -p \
"{\"spec\":{\"providerID\":\"gce://$PROJECT_ID/$ZONE/$MASTER_NODE\"}}"

# * 2. Patch Worker Nodes
for node in "${WORKER_NODES[@]}"; do
    echo "🔧 Patching providerID and labeling worker node: $node"
    kubectl patch node "$node" -p \
    "{\"spec\":{\"providerID\":\"gce://$PROJECT_ID/$ZONE/$node\"}}"
done

echo "🔧 Updating cloud config files..."
# * 3. Modify kube-controller-manager
# Remove existing cloud-provider flag from controller-manager.yaml
sudo yq -i 'del(.spec.containers[0].command[] | select(. == "--cloud-provider=gce"))' /etc/kubernetes/manifests/kube-controller-manager.yaml

# Append nodeipam to controller list if not already there
sudo yq -i '
  (.spec.containers[0].command[] | select(test("--controllers="))) =
  (.spec.containers[0].command[] | select(test("--controllers=")) + ",nodeipam")
' /etc/kubernetes/manifests/kube-controller-manager.yaml

# * 4. Modify kube-apiserver
# Add "--cloud-provider=external" to kube-apiserver.yaml container command arguments
sudo yq -i '.spec.containers[0].command += "--cloud-provider=external"' /etc/kubernetes/manifests/kube-apiserver.yaml

# * 5. Create cloud config
echo "📄 Creating cloud config file..."
sudo mkdir -p /etc/kubernetes/cloud.config
sudo tee /etc/kubernetes/cloud.config/gcp-ccm.conf > /dev/null <<EOF
[global]
node-tags = k8s-node
node-tags = kubernetes-node
EOF

# * 6. Update gcp-ccm.yaml (dynamically insert vars)
echo "📦 Applying Google Cloud Controller Manager..."
envsubst < ./online-auction-kubernetes/self-managed/manifests/gcp-ccm.yaml | kubectl apply -f -

# * 7. Bind clusterrole if needed
echo "🔐 Creating clusterrole bindings for cloud controller manager..."
kubectl create clusterrole cloud-controller-patch-nodes \
--verb=patch,update,get \
--resource=nodes || true

kubectl create clusterrolebinding cloud-controller-patch-nodes \
--clusterrole=cloud-controller-patch-nodes \
--serviceaccount=kube-system:cloud-controller-manager || true

echo "✅ Cloud Controller setup and Node patching complete!"
