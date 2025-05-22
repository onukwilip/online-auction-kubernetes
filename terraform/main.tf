provider "google" {
  project = "impactful-shard-429011-e7"
  region  = "us-central1"
  zone    = "us-central1-a"
}

data "google_client_config" "default" {}

# * CLUSTER

# Provision the Online Acution Kubernetes Cluster on GKE
resource "google_container_cluster" "online-auction-cluster" {
  name                = "online-auction-cluster"
  location            = "us-central1"
  enable_autopilot    = true
  deletion_protection = false
}
