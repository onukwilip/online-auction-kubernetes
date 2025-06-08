# TODO: EXPOSE THESE PORTS FOR THE CONTROL PLANE AND WORKER NODES USING FIREWALL RULES
# * Control plane
# API server - 6443
# etcd server client API - 2379-2380
# Kubelet API - 10250
# Kube-scheduler - 10251
# kube-controller-manager - 10252
# * Worker node
# Kubelet API - 10250
# Kube-proxy - 10256
# NodePort Services - 30000-32767

# TODO: RUN THE `common.sh` SCRIPT ON EACH NODE IN THE CLUSTER (BOTH MASTER AND WORKER)