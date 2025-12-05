import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        uploader: {
          select: { name: true, email: true, image: true },
        },
        recipient: {
          select: { name: true, email: true, image: true },
        },
        payments: {
          include: {
            paidBy: {
              select: { name: true, email: true, image: true },
            },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check access
    if (
      invoice.uploaderId !== session.user.id &&
      invoice.recipientId !== session.user.id
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Only uploader can edit invoice details
    if (invoice.uploaderId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { invoiceNumber, invoiceDate, recipientName, totalAmount, recipientEmail } = body;

    let recipientId = invoice.recipientId;
    if (recipientEmail !== undefined) {
      if (recipientEmail) {
        const recipient = await prisma.user.findUnique({
          where: { email: recipientEmail },
        });
        if (recipient && recipient.roles?.includes("BUSINESS")) {
          recipientId = recipient.id;
        }
      } else {
        recipientId = null;
      }
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(invoiceNumber !== undefined && { invoiceNumber }),
        ...(invoiceDate !== undefined && { invoiceDate: new Date(invoiceDate) }),
        ...(recipientName !== undefined && { recipientName }),
        ...(totalAmount !== undefined && { totalAmount: parseFloat(totalAmount) }),
        recipientId,
      },
      include: {
        uploader: {
          select: { name: true, email: true },
        },
        recipient: {
          select: { name: true, email: true },
        },
        payments: true,
      },
    });

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Only uploader can delete
    if (invoice.uploaderId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.invoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}

