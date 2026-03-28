

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  const projectCount = await prisma.project.count();
  const userCount = await prisma.user.count();
  const categoryCount = await prisma.category.count();

  if (projectCount > 0 && userCount > 0 && categoryCount > 0) {
    console.log('\n✅ البيانات موجودة بالفعل في PostgreSQL:\n');
    console.log(`   • المستخدمون: ${userCount}`);
    console.log(`   • التصنيفات: ${categoryCount}`);
    console.log(`   • المشاريع: ${projectCount}`);
    console.log('\n💡 استخدم "npm run db:studio" لعرض/تعديل البيانات\n');
  } else {
    console.log('\n⚠️  القاعدة فارغة!');
    console.log('   لإعادة ملء البيانات، استخدم Prisma Studio أو أعد الملف من Git.\n');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
