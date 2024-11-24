# [Complete Kubernetes Course Notes](https://www.youtube.com/watch?v=2T86xAtR6Fo&t=1382s)

# Tools

## [Docker Desktop](https://docs.docker.com/desktop/setup/install/linux/ubuntu/) 

### Run

systemctl \--user start docker-desktop

## [Devbox](https://www.jetify.com/docs/devbox/quickstart/)

This can run a vm within a project folder that also tracks packages specific to the environment

### Setup a Project Folder

devbox init  
devbox add {package@version}

### Run

devbox shell

# Course

Using CDKTF instead of Civo then set up your VPC [here](https://medium.com/@stevosjt88/setting-up-an-aws-vpc-using-cdktf-3bab8f6b23dd) then deploy EKS [here](https://medium.com/@stevosjt88/creating-an-eks-cluster-using-cdktf-ed6cf28599c9) then Karpenter [here](https://medium.com/@stevosjt88/creating-an-eks-cluster-using-cdktf-karpenter-addon-7275f25aa52c)

## Setup Project Folder

Create a project folder (eg: devops-directive-kubernetes-course2)  
cd devops-directive-kubernetes-course2

### Install CDKTF in devbox

devbox add nodePackages.cdktf-cli  
cdktf init

Create a folder adjacent to the project folder    
git clone [https://github.com/sidpalas/devops-directive-kubernetes-course](https://github.com/sidpalas/devops-directive-kubernetes-course)  
Copy all contents of devops-directive-kubernetes-course2 into devops-directive-kubernetes-course  
Delete the devops-directive-kubernetes-course2 folder

## Start the Course

cd [devops-directive-kubernetes-course](https://github.com/sidpalas/devops-directive-kubernetes-course)   
devbox shell  
devbox list  
task \--list-all \# (or just run tl) lists a number of KinD tasks the instructor built

## Working with KinD

### Generate KinD Config

cd 03-installation-and-setup  
task kind:01-generate-config

### Create Cluster

kind create cluster \--config kind-config.yaml  
kubectl get nodes  
kubectl get pods \-A

### Replace Civo with CDKTF

Add this block to devbox.json:

"env": {  
    "AWS\_PROFILE": "kubernetesCourse"  
 }
