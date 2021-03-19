# Install

Use `yarn` and not `npm`.

```
yarn
```

# Setup

1. Create a new RDS Cluster in AWS with the following configuration:
  - Standard Create
  - Engine Type: Amazon Aurora
  - Edition: MySQL
  - Capacity Type: Serverless
  - Version: MySQL 5.7
  - Cluster Identifier: replidraw (or whatever you want)
  - Web Service Data API: Enable
  - All remaining settings default
1. Copy down the username and password of the created database somewhere
1. Copy down the ARN of the created RDS cluster
1. Create a new Secret in AWS with the configuration:
  - Secret Type: Credentials for RDS Database
  - Specify the username and password from the above step
  - Encryption key: deafult
  - Which RDS database this will access: the one you just created above
  - Secret name: replidraw
  - Remaining settings: default
1. Copy down the ARN of the created secret
1. Add the following environment variables:
  * `AMAZON_ACCESS_KEY_ID` - the standard aws access key (e.g., from `~/.aws/credentials`)
  * `AMAZON_SECRET_ACCESS_KEY` - the standard aws secret key
  * `AMAZON_REGION` - the region you created the cluster in
  * `REPLIDRAW_DB_NAME` - `"replicache"` or whatever you named the database
  * `REPLIDRAW_CLUSTER_ARN` - the RDS cluster ARN from above
  * `REPLIDRAW_SECRET_ARN` - the RDS secret ARN from above

# Run Dev Version

```sh
yarn dev
```

# Run Prod Version

```sh
yarn build
yarn start
```

# Init RDS Schema

The code does not currently automatically create and version its RDS schema.

To manually do so, first delete the existing database of there is one:

```bash
aws rds-data execute-statement \
--resource-arn=$REPLIDRAW_CLUSTER_ARN \
--secret-arn=$REPLIDRAW_SECRET_ARN \
--sql="drop database $REPLIDRAW_DB_NAME"
```

Then start the server and load: `http://localhost:3000/api/init` (or the same on whatever host it's running on).
