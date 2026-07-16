import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';

// GET /api/bookings - Lists the current user's bookings (either customer bookings or provider bookings)
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const where: any = {};
    if (currentUser.role === Role.PROVIDER) {
      where.providerId = currentUser.id;
      where.bookedById = { not: null }; // Providers see booked slots
    } else {
      where.bookedById = currentUser.id; // Customers see their own bookings
    }

    const bookings = await prisma.slot.findMany({
      where,
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

    return NextResponse.json({ bookings });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/bookings - Book an available slot
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (currentUser.role !== Role.CUSTOMER) {
      return NextResponse.json({ error: 'Only customers can book slots.' }, { status: 403 });
    }

    const { slotId } = await req.json();
    if (!slotId) {
      return NextResponse.json({ error: 'Missing slotId' }, { status: 400 });
    }

    // Attempt to book the slot using optimistic locking
    try {
      const updatedSlot = await prisma.slot.update({
        where: {
          id: slotId,
          bookedById: null, // Critical: only update if it is not already booked
        },
        data: {
          bookedById: currentUser.id,
        },
      });

      return NextResponse.json({ success: true, slot: updatedSlot });
    } catch (error: any) {
      // Prisma error code for target record not found (meaning bookedById was not null, or slotId didn't exist)
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'This time slot is no longer available or has already been booked by another user.' },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error booking slot:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/bookings - Cancel a booking
export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slotId = searchParams.get('slotId');

    if (!slotId) {
      return NextResponse.json({ error: 'Missing slotId' }, { status: 400 });
    }

    // Check if the slot belongs to this user or if they are the provider
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    // Customers can cancel their own bookings, Providers can cancel bookings made on their slots
    const isAuthorized =
      (currentUser.role === Role.CUSTOMER && slot.bookedById === currentUser.id) ||
      (currentUser.role === Role.PROVIDER && slot.providerId === currentUser.id);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized to cancel this booking.' }, { status: 403 });
    }

    // Release the slot
    const updatedSlot = await prisma.slot.update({
      where: { id: slotId },
      data: {
        bookedById: null,
      },
    });

    return NextResponse.json({ success: true, slot: updatedSlot });
  } catch (error: any) {
    console.error('Error canceling booking:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/bookings - Reschedule a booking (Atomic cancellation and new booking)
export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (currentUser.role !== Role.CUSTOMER) {
      return NextResponse.json({ error: 'Only customers can reschedule bookings.' }, { status: 403 });
    }

    const { oldSlotId, newSlotId } = await req.json();
    if (!oldSlotId || !newSlotId) {
      return NextResponse.json({ error: 'Missing oldSlotId or newSlotId' }, { status: 400 });
    }

    if (oldSlotId === newSlotId) {
      return NextResponse.json({ error: 'New slot must be different from the old slot.' }, { status: 400 });
    }

    // Execute reschedule in a single database transaction to guarantee atomicity
    try {
      const [releasedSlot, bookedSlot] = await prisma.$transaction([
        // 1. Release the old slot (only if currently booked by this user)
        prisma.slot.update({
          where: {
            id: oldSlotId,
            bookedById: currentUser.id,
          },
          data: {
            bookedById: null,
          },
        }),
        // 2. Claim the new slot (only if it is currently available)
        prisma.slot.update({
          where: {
            id: newSlotId,
            bookedById: null,
          },
          data: {
            bookedById: currentUser.id,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        releasedSlot,
        bookedSlot,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          {
            error:
              'Rescheduling failed. Either the new slot was booked by someone else, or you do not have permission to modify the original booking.',
          },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error rescheduling booking:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
