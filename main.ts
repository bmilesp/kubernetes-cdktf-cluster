import { App } from "cdktf"
import { NetworkStack } from "./stacks/network/networkStack";
import { TFStateBackupStack } from "./stacks/tfStateBackup/TFStateBackupStack";

// Construct the app
const app = new App();
const backendStateS3BucketName = "kubernetes-course-tf-state-backup-bucket"
const region = "us-west-2"
// TFStateBackupStack 
new TFStateBackupStack(
  app,
  "tfStateBackupStack",
  backendStateS3BucketName,
  region,
  true
)

new NetworkStack(
  app,
  backendStateS3BucketName,
  "us-west-2",
  "kubernetesCourse"
)


app.synth();
