SalesPulse360 - Deployment & HDI Instructions

Overview
This file contains recommended steps to deploy SalesPulse360 to SAP BTP (Cloud Foundry) and to create HDI views in the HDI container.

Prerequisites
- SAP BTP CLI (cf)
- MTA CLI (`mbt`) or `cf` + `npm` for deploy
- Access to XSUAA, HDI container services

HDI / HANA View Deployment (recommended)
1. Build the CAP project:

```bash
npm ci
npx cds build --production
```

2. Push the database deployer module to Cloud Foundry to execute HDI deployment (MTA/mta.yaml handles this during mta build):

```bash
mbt build
cf deploy mta_archives/SalesPulse2026_1_1.0.0.mtar
```

3. If you need to create or inspect SQL views manually, connect to the HDI container and run the SQL script in `db/sql/create_hdi_views.sql` using `hdbsql` or SAP HANA database explorer.

Local development (sqlite)
To run locally using the sqlite adapter for CAP (for dev/testing only):

```bash
npm ci
NODE_ENV=development npx cds run --in-memory
```

CI/CD
A GitHub Actions pipeline is provided in `.github/workflows/ci.yml` that builds the project and uploads the `gen` build artifact.

Security and Production
- Ensure XSUAA & role collections in `xs-security.json` are configured for your subaccount.
- Ensure HDI container credentials are provisioned and the `mta.yaml` references the service.

Notes
- Creating HDI calculation views typically requires modeling in SAP HANA tools or Web IDE; the provided SQL script is a starting point and may need adaptation for your HDI schema.
