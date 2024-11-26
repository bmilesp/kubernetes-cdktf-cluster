import { S3Backend, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { DataAwsIamPolicyDocument } from "@cdktf/provider-aws/lib/data-aws-iam-policy-document";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { EksCluster } from "@cdktf/provider-aws/lib/eks-cluster";
import { DataTlsCertificate } from "@cdktf/provider-tls/lib/data-tls-certificate";
import { IamOpenidConnectProvider } from "@cdktf/provider-aws/lib/iam-openid-connect-provider";
import { Resource } from "@cdktf/provider-null/lib/resource";
import { TlsProvider } from "@cdktf/provider-tls/lib/provider";
import { NullProvider } from "@cdktf/provider-null/lib/provider";
import { RandomProvider } from "@cdktf/provider-random/lib/provider";

export class EksStack extends TerraformStack {

    public readonly cluster: EksCluster;
    public readonly oidcProvider: IamOpenidConnectProvider;
    public readonly role: IamRole;
    public readonly securityGroup: SecurityGroup;

    constructor(scope: any, backendStateS3BucketName: string, region: string, name: string, networkStack: any) {
        super(scope, name);
        new S3Backend(this, {
            bucket: backendStateS3BucketName,
            key: name,
            region: region
          })

        new AwsProvider(this, 'aws', {region: region});

        // Build EKS cluster role
        const assumeRolePolicy = new DataAwsIamPolicyDocument(
            this,
            `eks-cluster-assumeRolePolicy`,
            {
                statement: [
                    {
                        effect: 'Allow',
                        actions: ['sts:AssumeRole'],
                        principals: [
                            {
                                identifiers: [
                                    'eks.amazonaws.com',
                                ],
                                type: 'Service',
                            },
                        ],
                    },
                ],
            }
        );

        this.role = new IamRole(this, `eks-master-role`, {
            name: `eks-master-role`,
            assumeRolePolicy: assumeRolePolicy.json,
        });

        const policies = [
            'AmazonEKSClusterPolicy',
            'AmazonEKSServicePolicy',
        ];

        policies.forEach((policy) => {
            new IamRolePolicyAttachment(this, `eks-master-policy-attachment-${policy}`, {
                role: this.role.name,
                policyArn: `arn:aws:iam::aws:policy/${policy}`,
            });
        });

        // Build security group.
        this.securityGroup = new SecurityGroup(this, `eks-master-security-group`, {
            name: `eks-master-security-group`,
            vpcId: networkStack.vpcId,
            description: `eks master security group`,
            ingress: [
                {
                    fromPort: 0,
                    toPort: 0,
                    protocol: '-1',
                    selfAttribute: true,
                },
            ],
            egress: [
                {
                    fromPort: 0,
                    toPort: 0,
                    protocol: '-1',
                    cidrBlocks: ['0.0.0.0/0'],
                },
            ],
            tags: {
                Name: `eks-master-security-group`,
            },
            lifecycle: {
                ignoreChanges: ['ingress', 'egress'],
            },
        });

        // EKS cluster
        this.cluster = new EksCluster(this, 'eks-cluster', {
            name: `dev-eks-cluster`,
            version: '1.30',
            roleArn: this.role.arn,
            vpcConfig: {
                subnetIds: [...networkStack.publicSubnetIds, ...networkStack.privateSubnetIds],
                securityGroupIds: [this.securityGroup.id],
            },
            tags: {
                Name: `dev-eks-cluster`,
            },
        });

        // OIDC provider
        new TlsProvider(this, 'tls-provider');
        const issuerUrl = this.cluster.identity.get(0).oidc.get(0).issuer;

        const tlsCert = new DataTlsCertificate(this, 'eks-oidc-issuer', {
            url: issuerUrl,
        });

        this.oidcProvider = new IamOpenidConnectProvider(this, `openid-provider`, {
            clientIdList: ['sts.amazonaws.com'],
            thumbprintList: [tlsCert.certificates.get(0).sha1Fingerprint],
            url: issuerUrl,
            tags: {
                Name: `dev-eks-cluster-oidc`,
            },
        });

        // Wait for cluster to be ready
        new RandomProvider(this, 'random-provider');
        new NullProvider(this, 'null-provider');
        const resource = new Resource(this, 'wait-for-cluster', {
            dependsOn: [this.cluster],
        });

        resource.addOverride('provisioner', [
            {
                'local-exec': [
                    {
                        command:
                            'for i in `seq 1 60`; do wget --no-check-certificate -O - -q $ENDPOINT/healthz >/dev/null && exit 0 || true; sleep 5; done; echo TIMEOUT && exit 1',
                        interpreter: ['/bin/sh', '-c'],
                        environment: {
                            ENDPOINT: this.cluster.endpoint,
                        },
                    },
                ],
            },
        ]);
    };
}