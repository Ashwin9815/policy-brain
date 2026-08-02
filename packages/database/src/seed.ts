import { prisma } from "./index.js";
import bcrypt from "bcryptjs";

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "acme-health" },
    update: {},
    create: {
      name: "Acme Health Plan",
      slug: "acme-health",
    },
  });

  const passwordHash = await bcrypt.hash("demo1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@acme-health.com" },
    update: {},
    create: {
      email: "admin@acme-health.com",
      name: "Demo Admin",
      passwordHash,
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  const folder = await prisma.folder.upsert({
    where: { id: "seed-root-folder" },
    update: {},
    create: {
      id: "seed-root-folder",
      name: "Prior Authorization Policies",
      description: "Root folder for PA policy documents and rules",
      organizationId: org.id,
    },
  });

  await prisma.folderPermission.upsert({
    where: { folderId_userId: { folderId: folder.id, userId: admin.id } },
    update: {},
    create: {
      folderId: folder.id,
      userId: admin.id,
      permission: "ADMIN",
    },
  });

  const policy = await prisma.policy.create({
    data: {
      title: "MRI Prior Authorization",
      description: "Rules governing MRI prior authorization for outpatient imaging",
      status: "DRAFT",
      folderId: folder.id,
      organizationId: org.id,
      createdById: admin.id,
    },
  });

  await prisma.rule.create({
    data: {
      policyId: policy.id,
      title: "MRI Medical Necessity Check",
      description: "Requires documented conservative treatment before MRI approval",
      status: "DRAFT",
      createdById: admin.id,
      dslContent: {
        metadata: { name: "MRI Medical Necessity Check", version: 1 },
        blocks: [
          {
            type: "eligibility",
            conditions: [
              { field: "procedure_code", operator: "in", value: ["70551", "70552", "70553"] },
            ],
          },
          {
            type: "condition",
            logic: "AND",
            conditions: [
              { field: "conservative_treatment_weeks", operator: ">=", value: 6 },
              { field: "clinical_indication", operator: "exists", value: true },
            ],
          },
          {
            type: "decision",
            outcome: "APPROVE",
            evidence: ["clinical_indication", "conservative_treatment_weeks"],
          },
        ],
      },
      versions: {
        create: {
          version: 1,
          dslContent: {
            metadata: { name: "MRI Medical Necessity Check", version: 1 },
            blocks: [],
          },
          changeNote: "Initial seed version",
        },
      },
    },
  });

  console.log("Seed complete:");
  console.log(`  Organization: ${org.name} (${org.slug})`);
  console.log(`  Admin user:   admin@acme-health.com / demo1234`);
  console.log(`  Folder:       ${folder.name}`);
  console.log(`  Policy:       ${policy.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
