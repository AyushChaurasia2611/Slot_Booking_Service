import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getDateBoundsInTimezone } from '@/lib/timezone';

// GET /api/slots - Paginated and filtered slot listings
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get('providerId') || undefined;
    const date = searchParams.get('date') || undefined;
    const timezone = searchParams.get('timezone') || 'UTC';
    const status = searchParams.get('status') || 'available'; // 'available' | 'booked' | 'all'
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '6', 10);

    const skip = (page - 1) * limit;

    // Build Prisma query filters
    const where: any = {};

    if (providerId) {
      where.providerId = providerId;
    }

    if (status === 'available') {
      where.bookedById = null;
    } else if (status === 'booked') {
      where.bookedById = { not: null };
    }

    if (date) {
      const { start, end } = getDateBoundsInTimezone(date, timezone);
      where.startTime = {
        gte: start,
        lte: end,
      };
    }

    // Fetch total matching items count for pagination
    const totalCount = await prisma.slot.count({ where });

    // Fetch slots
    const slots = await prisma.slot.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        startTime: 'asc',
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            timezone: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            timezone: true,
          },
        },
      },
    });

    return NextResponse.json({
      slots,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Error fetching slots:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/slots - Provider creates a new slot
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized. Provider access only.' }, { status: 401 });
    }

    const { startTime, endTime } = await req.json();

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'Missing startTime or endTime' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return NextResponse.json({ error: 'Start time must be before end time.' }, { status: 400 });
    }

    if (start < new Date()) {
      return NextResponse.json({ error: 'Cannot create slots in the past.' }, { status: 400 });
    }

    // Check for overlaps with existing slots for this provider
    const overlappingSlot = await prisma.slot.findFirst({
      where: {
        providerId: currentUser.id,
        OR: [
          {
            startTime: { lt: end },
            endTime: { gt: start },
          },
        ],
      },
    });

    if (overlappingSlot) {
      return NextResponse.json({ error: 'This time slot overlaps with an existing slot.' }, { status: 400 });
    }

    // Create the slot
    const slot = await prisma.slot.create({
      data: {
        startTime: start,
        endTime: end,
        providerId: currentUser.id,
      },
    });

    return NextResponse.json({ success: true, slot }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating slot:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
