import { App } from "cdktf"
import { NetworkStack } from "./stacks/network/networkStack";
import { TFStateBackupStack } from "./stacks/tfStateBackup/TFStateBackupStack";
import { EksStack } from "./stacks/eks/eksStack";

// Construct the app
const app = new App();
const backendStateS3BucketName = "kubernetes-course-tf-state-backup-bucket"
const region = "us-west-2"
// TFStateBackupStack 
new TFStateBackupStack(
  app,
  backendStateS3BucketName,
  region,
  "tfStateBackupStack",
  true
)

const networkStack = new NetworkStack(
  app,
  backendStateS3BucketName,
  region,
  "kubernetesCourse"
)

const eksStack = new EksStack(
  app,  
  backendStateS3BucketName,
  region,
  "eksStack",
  networkStack
);

eksStack.addDependency(networkStack);


app.synth();
