import { cookies } from 'next/headers';
import { prisma } from './db';
import { User } from '@prisma/client';

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('slot_booking_user_id')?.value || null;
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export async function getAllUsers() {
  try {
    return await prisma.user.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}
