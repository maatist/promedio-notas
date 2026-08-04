import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a sample user
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { username: 'estudiante' },
    update: {},
    create: {
      username: 'estudiante',
      passwordHash,
    },
  });

  console.log(`Created user: ${user.username}`);

  // Create a period
  const period = await prisma.period.create({
    data: {
      name: 'Semestre 2024-1',
      userId: user.id,
    },
  });

  console.log(`Created period: ${period.name}`);

  // Create a simple subject
  const simpleSubject = await prisma.subject.create({
    data: {
      name: 'Calculo I',
      periodId: period.id,
      isComposite: false,
      components: {
        create: {
          name: 'General',
          weightPercentage: 1.0,
        },
      },
    },
    include: { components: true },
  });

  // Add grades to simple subject
  await prisma.grade.createMany({
    data: [
      {
        name: 'Certamen 1',
        value: 5.5,
        weightPercentage: 0.3,
        order: 0,
        subjectComponentId: simpleSubject.components[0].id,
      },
      {
        name: 'Certamen 2',
        value: 6.0,
        weightPercentage: 0.3,
        order: 1,
        subjectComponentId: simpleSubject.components[0].id,
      },
      {
        name: 'Examen',
        value: 4.5,
        weightPercentage: 0.4,
        order: 2,
        subjectComponentId: simpleSubject.components[0].id,
      },
    ],
  });

  console.log(`Created simple subject: ${simpleSubject.name}`);

  // Create a composite subject
  const compositeSubject = await prisma.subject.create({
    data: {
      name: 'Fisica General',
      periodId: period.id,
      isComposite: true,
      components: {
        create: [
          { name: 'Catedra', weightPercentage: 0.6 },
          { name: 'Laboratorio', weightPercentage: 0.3 },
          { name: 'Terreno', weightPercentage: 0.1 },
        ],
      },
    },
    include: { components: true },
  });

  const catedra = compositeSubject.components.find((c) => c.name === 'Catedra')!;
  const lab = compositeSubject.components.find((c) => c.name === 'Laboratorio')!;
  const terreno = compositeSubject.components.find((c) => c.name === 'Terreno')!;

  // Add grades to catedra
  await prisma.grade.createMany({
    data: [
      { name: 'Certamen 1', value: 5.0, weightPercentage: 0.3, order: 0, subjectComponentId: catedra.id },
      { name: 'Certamen 2', value: 6.0, weightPercentage: 0.3, order: 1, subjectComponentId: catedra.id },
      { name: 'Examen', value: 4.5, weightPercentage: 0.4, order: 2, subjectComponentId: catedra.id },
    ],
  });

  // Add grades to laboratorio
  await prisma.grade.createMany({
    data: [
      { name: 'Informe 1', value: 6.5, weightPercentage: 0.5, order: 0, subjectComponentId: lab.id },
      { name: 'Informe 2', value: 7.0, weightPercentage: 0.5, order: 1, subjectComponentId: lab.id },
    ],
  });

  // Add grade to terreno
  await prisma.grade.create({
    data: {
      name: 'Visita tecnica',
      value: 6.0,
      weightPercentage: 1.0,
      order: 0,
      subjectComponentId: terreno.id,
    },
  });

  console.log(`Created composite subject: ${compositeSubject.name}`);
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
