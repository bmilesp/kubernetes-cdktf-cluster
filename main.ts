import { App } from "cdktf"
import { Network } from "./stacks/network";

//import { TFStateBackupStack } from './stacks/tfStateBackup/TFStateBackupStack' 

// Construct the app
const app = new App();


new Network(
  app,
  "us-west-2",
  "kubernetesCourse"
)

app.synth();
