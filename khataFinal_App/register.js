// register.js
import bcrypt from 'bcryptjs';
import prisma from './prisma/client.js';

const registerUser = async () => {
  const name = 'Khata User A';
  const email = 'admin@khata.com';
  const password = 'khata786';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('User already exists');
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  });

  console.log('User created:', user);
};

registerUser().catch(console.error);
