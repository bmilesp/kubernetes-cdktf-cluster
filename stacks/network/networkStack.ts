import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { App, S3Backend, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { InternetGateway } from "@cdktf/provider-aws/lib/internet-gateway";
import { RouteTable } from "@cdktf/provider-aws/lib/route-table";
import { Eip } from "@cdktf/provider-aws/lib/eip";
import { NatGateway } from "@cdktf/provider-aws/lib/nat-gateway";
import { RouteTableAssociation } from "@cdktf/provider-aws/lib/route-table-association";

export class NetworkStack extends TerraformStack {

    public readonly vpcId: string;
    public readonly publicSubnetIds: string[];
    public readonly privateSubnetIds: string[];
    private readonly region:string;

    constructor(app: App, backendStateS3BucketName:string, region: string, name: string) {
        super(app, "networkStack");
        new S3Backend(this, {
            bucket: backendStateS3BucketName,
            key: name,
            region: region
          })
        new AwsProvider(this, "aws", { region: region });
        this.region = region;
        const vpcCidr = "10.0.0.0/20";
        const publicSubnets = ["10.0.0.0/25", "10.0.0.128/25", "10.0.1.0/25"];
        const privateSubnets = ["10.0.2.0/23", "10.0.4.0/23", "10.0.6.0/23"];

        const vpc = new Vpc(this, "vpc", {
            cidrBlock: vpcCidr,
            tags: {
                Name: name
            }
        });

        this.vpcId = vpc.id;
        this.privateSubnetIds = this.buildSubnets(
            vpc.id,
            privateSubnets,
            "private",
            name
        );
        this.publicSubnetIds = this.buildSubnets(vpc.id, publicSubnets, "public", name);
        this.buildGatewaysAndRoutes(this.publicSubnetIds, this.privateSubnetIds, vpc.id, name);
    }

    private buildSubnets(
        vpcId: string,
        subnets: string[],
        subnetType: string,
        name:string
    ): string[] {
        const subnetIds: string[] = [];

        let count = 0;

        subnets.forEach((subnet) => {
            count++;
            const s = new Subnet(this, `${subnetType}${count}`, {
                vpcId: vpcId,
                cidrBlock: subnet,
                availabilityZone: `${this.region}${(count + 9).toString(36)}`,
                tags: {
                    Name: `${name}`,
                    SubnetType: `${subnetType}${count}`
                },
            });
            subnetIds.push(s.id);
        });

        return subnetIds;
    }

    private buildGatewaysAndRoutes(
        publicSubnetIds: string[],
        privateSubnetIds: string[],
        vpcId: string,
        name: string
    ) {
        const gateway = new InternetGateway(this, "internet-gateway", {
            vpcId: vpcId,
            tags: {
                Name: name 
            }
        });

        const publicRt = new RouteTable(this, "route-table-public", {
            vpcId: vpcId,
            route: [
                {
                    cidrBlock: "0.0.0.0/0",
                    gatewayId: gateway.id,
                },
            ],
            tags: {
                Name: name 
            }
        });

        let count = 0;
        publicSubnetIds.forEach((id) => {
            count++;
            const eip = new Eip(this, `eip-${count}`, {
                domain: "vpc"
            });

            const gw = new NatGateway(this, `nat-gateway-${count}`, {
                allocationId: eip.allocationId,
                subnetId: id,
                tags: {
                    Name: name
                }
            });

            new RouteTableAssociation(
                this,
                `route-table-association-public-${count}`,
                {
                    routeTableId: publicRt.id,
                    subnetId: id,
                }
            );

            // Private Route Table
            const rt = new RouteTable(this, `route-table-private-${count}`, {
                vpcId: vpcId,
                route: [
                    {
                        cidrBlock: "0.0.0.0/0",
                        natGatewayId: gw.id,
                    },
                ],
            });

            new RouteTableAssociation(
                this,
                `route-table-association-private-${count}`,
                {
                    routeTableId: rt.id,
                    subnetId: privateSubnetIds[count - 1],
                }
            );
        });
    }
}